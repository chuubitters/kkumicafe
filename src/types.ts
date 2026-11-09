export type CakeShape = 'round' | 'square' | 'heart' | 'oval' | 'star';
export type CakeSize = 'mini' | 'regular' | 'large';
export type Flavor = 'chocolate' | 'vanilla' | 'strawberry' | 'redvelvet' | 'matcha' | 'rainbow';
export type Filling = 'strawberry' | 'ganache' | 'vanilla' | 'blueberry' | 'caramel' | 'oreo';
export type FrostingType = 'buttercream' | 'whipped' | 'chocolate' | 'strawberry';
export type FrostTexture = 'smooth' | 'swirl' | 'combed' | 'rustic';
export type Tip = 'round' | 'star' | 'shell' | 'leaf' | 'ruffle' | 'rosette';
export type BorderStyle = 'none' | 'shell' | 'beads' | 'ruffle' | 'rosettes' | 'star';
export type Stand = 'none' | 'board' | 'plate' | 'pedestal';
export type FrameShape = 'circle' | 'square' | 'heart' | 'oval' | 'scallop';
export type SprinkleKind = 'rainbow' | 'chocolate' | 'hearts' | 'stars' | 'pearls';

export type ItemKind =
  | 'strawberry' | 'cherry' | 'blueberry' | 'raspberry' | 'peach' | 'kiwi'
  | 'sprinkles'
  | 'rose' | 'daisy' | 'blossom' | 'heart' | 'star' | 'bow' | 'ribbon'
  | 'candle' | 'numberCandle' | 'bear' | 'bunny'
  | 'topperBirthday' | 'topperHeart' | 'bunting'
  | 'chocShard' | 'truffle' | 'chocCurl' | 'macaron'
  // box-only stickers
  | 'label' | 'stamp' | 'stickerCherry' | 'stickerHeart' | 'stickerStar' | 'stickerFlower' | 'tag'
  | 'piping' | 'text' | 'photo';

export interface Item {
  id: string;
  kind: ItemKind;
  x: number; // plane units (cake radius = 200)
  y: number;
  rot: number; // radians
  scale: number;
  seed: number;
  color?: string;
  color2?: string;
  text?: string;
  font?: string;
  fontSize?: number;
  variant?: string; // sprinkle kind, frame shape...
  fill?: boolean; // sprinkles: cover the whole cake top
  photoId?: string;
  crop?: { zoom: number; px: number; py: number };
  border?: boolean;
  borderColor?: string;
  // piping
  points?: number[]; // flat x,y plane coords
  tip?: Tip;
  size?: number;
}

export interface Frosting {
  type: FrostingType;
  color: string;
  color2: string;
  gradient: boolean;
  texture: FrostTexture;
  drip: boolean;
  dripColor: string;
}

export interface Borders {
  top: BorderStyle;
  topColor: string;
  bottom: BorderStyle;
  bottomColor: string;
  garland: boolean;
  garlandColor: string;
  ribbon: boolean;
  ribbonColor: string;
}

export interface CakeState {
  shape: CakeShape;
  size: CakeSize;
  layers: 1 | 2 | 3;
  flavor: Flavor;
  fillings: Filling[];
  frosting: Frosting;
  borders: Borders;
  stand: Stand;
  items: Item[];
  photos: Record<string, string>;
}

export type BoxShape = 'square' | 'rect' | 'heart' | 'round';
export type PatternType =
  | 'gingham' | 'plaid' | 'tartan' | 'vstripes' | 'hstripes' | 'polka' | 'flowers'
  | 'hearts' | 'checker' | 'floral' | 'solid';

export interface PatternSpec {
  type: PatternType;
  bg: string;
  c1: string;
  c2: string;
  scale: number;
  rotation: number; // degrees
  weight: number; // 0.3..1 band/dot size
}

export interface BoxState {
  shape: BoxShape;
  lid: PatternSpec;
  sideMatch: boolean;
  side: PatternSpec;
  ribbon: 'none' | 'cross' | 'single' | 'diagonal';
  ribbonColor: string;
  bow: boolean;
  window: 'none' | 'circle' | 'heart' | 'rect';
  sideText: string;
  sideTextColor: string;
  items: Item[];
}

export interface Postcard {
  to: string;
  message: string;
  from: string;
  background: 'parlor' | 'gingham' | 'tea' | 'sunshine';
}

export interface Project {
  id: string;
  name: string;
  mode: 'free' | 'challenge';
  challengeId?: string;
  cake: CakeState;
  box: BoxState;
  postcard: Postcard;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
  stars?: number;
}

export type Screen = 'home' | 'mode' | 'challenges' | 'editor' | 'box' | 'final' | 'collection';
