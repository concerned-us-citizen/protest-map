export interface RawLocation {
  address?: string;
  zip?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface RawEvent extends RawLocation {
  date?: string;
  name?: string;
  link?: string;
  info?: string;
  sheetName: string;
}
