import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Poi, PoiDocument } from './schemas/poi.schema';

@Injectable()
export class PoiService {
  constructor(
    @InjectModel(Poi.name) private poiModel: Model<PoiDocument>,
  ) {}

  async findAll(limit: number = 20, skip: number = 0) {
    const [data, total] = await Promise.all([
      this.poiModel.find({}, { 
        _id: 1, 
        ocmId: 1, 
        status: 1,
        'address.title': 1, 
        'address.town': 1,
        'address.stateOrProvince': 1,
        'address.country': 1,
      })
      .limit(limit)
      .skip(skip)
      .exec(),
      this.poiModel.countDocuments().exec(),
    ]);
    
    return { data, total, limit, skip };
  }

  async findByUuid(id: string) {
    return this.poiModel.findById(id).exec();
  }

  async findByOcmId(ocmId: number) {
    return this.poiModel.findOne({ ocmId: ocmId }).exec();
  }
}