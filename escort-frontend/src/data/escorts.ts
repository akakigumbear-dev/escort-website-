export interface Escort {
  id: string;
  username: string;
  city: string;
  gender: string;
  ethnicity: string;
  verified: boolean;
  vip: boolean;
  image: string;
  views: number;
}

const names = [
  "Anastasia", "Valentina", "Isabella", "Scarlett", "Natasha",
  "Sophia", "Bianca", "Camila", "Adriana", "Mila",
  "Elena", "Vivienne", "Arabella", "Celeste", "Dominique",
  "Giselle", "Juliette", "Tatiana", "Noelle", "Serena",
];

const cities = ["London", "Paris", "Dubai", "Milan", "New York", "Monaco", "Zurich", "Miami", "Barcelona", "Vienna"];
const genders = ["Female", "Female", "Female", "Female", "Trans"];
const ethnicities = ["European", "Latina", "Asian", "Mixed", "Middle Eastern", "African"];

export const escorts: Escort[] = names.map((name, i) => ({
  id: `escort-${i + 1}`,
  username: name,
  city: cities[i % cities.length],
  gender: genders[i % genders.length],
  ethnicity: ethnicities[i % ethnicities.length],
  verified: Math.random() > 0.3,
  vip: i < 8,
  image: `https://picsum.photos/seed/${name.toLowerCase()}/400/520`,
  views: Math.floor(Math.random() * 5000) + 500,
}));

export const vipEscorts = escorts.filter((e) => e.vip);
export const topViewed = [...escorts].sort((a, b) => b.views - a.views).slice(0, 10);
