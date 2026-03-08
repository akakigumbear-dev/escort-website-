import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { JwtAuthGuard } from 'src/Guards/jwt.guard';
import { OptionalJwtAuthGuard } from 'src/Guards/optional-jwt.guard';
import { SubscriptionPostsService } from './subscription-posts.service';
import { escortPicturesMulterOptions } from 'src/common/multer.config';

@Controller('subscription-posts')
export class SubscriptionPostsController {
  constructor(private readonly posts: SubscriptionPostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('media', escortPicturesMulterOptions))
  createPost(
    @Req() req: { user: { userId: string } },
    @Body() body: { profileId: string; content?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const mediaPath = file ? `/uploads/escort-pictures/${file.filename}` : null;
    const mediaType = file
      ? file.mimetype.startsWith('video/')
        ? 'video'
        : 'image'
      : null;
    return this.posts.createPost(
      req.user.userId,
      body.profileId,
      body.content?.trim() || null,
      mediaPath,
      mediaType,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  getMyPosts(@Req() req: { user: { userId: string } }) {
    return this.posts.getMyPosts(req.user.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('profile/:profileId')
  getPostsForProfile(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Req() req: { user?: { userId: string } },
  ) {
    const userId = req.user?.userId ?? null;
    return this.posts.getPostsForProfile(profileId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postId/upvote')
  upvote(
    @Req() req: { user: { userId: string } },
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.posts.upvote(req.user.userId, postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postId/unvote')
  unvote(
    @Req() req: { user: { userId: string } },
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.posts.unvote(req.user.userId, postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postId/comments')
  addComment(
    @Req() req: { user: { userId: string } },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() body: { content: string },
  ) {
    return this.posts.addComment(
      req.user.userId,
      postId,
      body.content?.trim() ?? '',
    );
  }

  @Get(':postId/comments')
  getComments(@Param('postId', ParseUUIDPipe) postId: string) {
    return this.posts.getComments(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':postId')
  deletePost(
    @Req() req: { user: { userId: string } },
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.posts.deletePost(req.user.userId, postId);
  }
}
