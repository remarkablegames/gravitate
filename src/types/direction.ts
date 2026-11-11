import { DIRECTION } from '../constants';

export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];
