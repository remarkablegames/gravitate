import { KEY } from '../constants';

export type MusicKey = (typeof KEY.MUSIC)[keyof typeof KEY.MUSIC];
