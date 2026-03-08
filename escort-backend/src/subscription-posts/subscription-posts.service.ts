import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SubscriptionPost } from 'database/entities/subscription-post.entity';
import { PostUpvote } from 'database/entities/post-upvote.entity';
import { PostComment } from 'database/entities/post-comment.entity';
import { EscortProfile } from 'database/entities/escort-profile.entity';
import { Subscription } from 'database/entities/subscription.entity';
import { SubscriptionStatus } from 'database/enums/enums';

@Injectable()
export class SubscriptionPostsService {
  constructor(
    @InjectRepository(SubscriptionPost)
    private readonly postRepo: Repository<SubscriptionPost>,
    @InjectRepository(PostUpvote)
    private readonly upvoteRepo: Repository<PostUpvote>,
    @InjectRepository(PostComment)
    private readonly commentRepo: Repository<PostComment>,
    @InjectRepository(EscortProfile)
    private readonly profileRepo: Repository<EscortProfile>,
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
  ) {}

  async createPost(
    userId: string,
    profileId: string,
    content: string | null,
    mediaPath: string | null,
    mediaType: string | null,
  ) {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId },
      relations: { user: true },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    if ((profile as any).user?.id !== userId) {
      throw new ForbiddenException('Not your profile');
    }
    const post = this.postRepo.create({
      profileId,
      authorUserId: userId,
      content: content?.trim() || null,
      mediaPath: mediaPath || null,
      mediaType: mediaType || null,
    });
    return this.postRepo.save(post);
  }

  async getMyPosts(userId: string) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: userId } } as any,
    });
    if (!profile) return { posts: [] };
    const posts = await this.postRepo.find({
      where: { profileId: profile.id },
      order: { createdAt: 'DESC' },
    });
    const withCounts = await this.addUpvoteAndCommentCounts(posts);
    return { posts: withCounts };
  }

  async getPostsForProfile(profileId: string, viewerUserId: string | null) {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId },
      relations: { user: true },
    });
    if (!profile) return { posts: [] };
    const isOwner = (profile as any).user?.id === viewerUserId;
    const isSubscribed = viewerUserId
      ? await this.subRepo.findOne({
          where: {
            escortProfileId: profileId,
            clientId: viewerUserId,
            status: SubscriptionStatus.ACTIVE,
          },
        })
      : null;
    if (!isOwner && !isSubscribed) return { posts: [] };
    const posts = await this.postRepo.find({
      where: { profileId },
      order: { createdAt: 'DESC' },
    });
    let upvotedIds: string[] = [];
    if (viewerUserId) {
      const upvotes = await this.upvoteRepo.find({
        where: {
          userId: viewerUserId,
          postId: In(posts.map((p) => p.id)),
        },
      });
      upvotedIds = upvotes.map((u) => u.postId);
    }
    const withCounts = await this.addUpvoteAndCommentCounts(posts);
    return {
      posts: withCounts.map((p) => ({
        ...p,
        upvotedByMe: upvotedIds.includes(p.id),
      })),
    };
  }

  private async addUpvoteAndCommentCounts(
    posts: SubscriptionPost[],
  ): Promise<any[]> {
    if (!posts.length) return [];
    const ids = posts.map((p) => p.id);
    const upvoteCounts = await this.upvoteRepo
      .createQueryBuilder('u')
      .select('u.postId', 'postId')
      .addSelect('COUNT(*)', 'count')
      .where('u.postId IN (:...ids)', { ids })
      .groupBy('u.postId')
      .getRawMany();
    const commentCounts = await this.commentRepo
      .createQueryBuilder('c')
      .select('c.postId', 'postId')
      .addSelect('COUNT(*)', 'count')
      .where('c.postId IN (:...ids)', { ids })
      .groupBy('c.postId')
      .getRawMany();
    const upMap = new Map(upvoteCounts.map((r) => [r.postId, Number(r.count)]));
    const cmMap = new Map(
      commentCounts.map((r) => [r.postId, Number(r.count)]),
    );
    return posts.map((p) => ({
      id: p.id,
      profileId: p.profileId,
      authorUserId: p.authorUserId,
      content: p.content,
      mediaPath: p.mediaPath,
      mediaType: p.mediaType,
      createdAt: p.createdAt,
      upvoteCount: upMap.get(p.id) ?? 0,
      commentCount: cmMap.get(p.id) ?? 0,
    }));
  }

  async upvote(userId: string, postId: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const existing = await this.upvoteRepo.findOne({
      where: { postId, userId },
    });
    if (existing) return { upvoted: true };
    await this.upvoteRepo.save(this.upvoteRepo.create({ postId, userId }));
    return { upvoted: true };
  }

  async unvote(userId: string, postId: string) {
    await this.upvoteRepo.delete({ postId, userId });
    return { upvoted: false };
  }

  async addComment(userId: string, postId: string, content: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const comment = this.commentRepo.create({
      postId,
      userId,
      content: content.trim(),
    });
    return this.commentRepo.save(comment);
  }

  async getComments(postId: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const comments = await this.commentRepo.find({
      where: { postId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    return {
      comments: comments.map((c) => ({
        id: c.id,
        postId: c.postId,
        userId: c.userId,
        userEmail: (c as any).user?.email,
        content: c.content,
        createdAt: c.createdAt,
      })),
    };
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: { profile: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    const profile = await this.profileRepo.findOne({
      where: { id: post.profileId },
      relations: { user: true },
    });
    if ((profile as any).user?.id !== userId) {
      throw new ForbiddenException('Not your post');
    }
    await this.postRepo.remove(post);
    return { ok: true };
  }
}
