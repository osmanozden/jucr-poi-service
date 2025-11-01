import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ _id: false })
export class PoiAddress {
  @Prop()
  title: string;

  @Prop()
  addressLine1: string;

  @Prop()
  town: string;

  @Prop()
  stateOrProvince: string;

  @Prop()
  postcode: string;

  @Prop()
  country: string;

  @Prop()
  latitude: number;

  @Prop()
  longitude: number;
}
const PoiAddressSchema = SchemaFactory.createForClass(PoiAddress);

@Schema({ _id: false })
export class PoiConnection {
  @Prop()
  connectionType: string;

  @Prop()
  powerKW: number;

  @Prop()
  currentType: string;

  @Prop()
  quantity: number;
}
const PoiConnectionSchema = SchemaFactory.createForClass(PoiConnection);

export type PoiDocument = Poi & Document;

@Schema({
  collection: 'pois',
  timestamps: true,
  _id: false,
  strict: true,
})
export class Poi {
  @Prop({
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
  })
  _id: string;

  @Prop({
    type: Number,
    required: true,
    unique: true,
    index: true,
  })
  ocmId: number;

  @Prop()
  status: string;

  @Prop()
  dateLastStatusUpdate: Date;

  @Prop({ type: PoiAddressSchema })
  address: PoiAddress;

  @Prop({ type: [PoiConnectionSchema] })
  connections: PoiConnection[];
}

export const PoiSchema = SchemaFactory.createForClass(Poi);