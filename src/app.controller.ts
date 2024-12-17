import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';
import { InjectModel } from '@nestjs/mongoose';
import { Cat, UpdateCatDto } from './schemas/cat.schemas';
import { isValidObjectId, Model } from 'mongoose';
import { log } from 'console';
import { ClientKafka } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectModel(Cat.name) private readonly catModel: Model<Cat>,
    @Inject('CAT_SERVICE') private readonly catClient: ClientKafka,
  ) {}

  @Get('/hello')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/cats')
  getCats() {
    return this.catModel.find().exec();
  }

  @Get('/cats/:id')
  async getById(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const cat = await this.catModel.findById(id);
    if (!cat) {
      throw new NotFoundException('Cat not found');
    }
    return cat;
  }

  @Post('/cats')
  async createCat(@Body() body: Cat) {
    const cat = new this.catModel(body);
    return cat.save();
  }

  @Patch('/cats/:id')
  async updateCat(@Body() body: UpdateCatDto, @Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const cat = await this.catModel.findById(id);
    log('cat', cat);
    if (!cat) {
      throw new NotFoundException('Cat not found');
    }

    cat.set(body);
    return cat.save();
  }

  @Delete('/cats/:id')
  async deleteCat(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const cat = await this.catModel.findById(id);
    if (!cat) {
      throw new NotFoundException('Cat not found');
    }

    await cat.deleteOne();
    return cat;

    // if (!isValidObjectId(id)) {
    //   throw new BadRequestException('Invalid ID format');
    // }
    // const cat = await this.catModel.findById(id);
    // if (!cat) {
    //   throw new NotFoundException('Cat not found');
    // }

    // await this.catModel.deleteOne({
    //   _id: id,
    // });

    // return 'Cat deleted';
  }

  @Get('/kafka')
  async kafka() {
    this.catClient.emit('cat_created', {
      name: 'Kafka Cat',
      age: 1,
      breed: 'Kafka 123123',
    });
    return 'Kafka message sent';
  }

  @Post('/kafka')
  async kafkaPost(@Body() body: Cat) {
    this.catClient.emit('cat_created', body);
    return 'Kafka message sent';
  }

  @Patch('/kafka/:id')
  async kafkaPatch(@Body() body: UpdateCatDto, @Param('id') id: string) {
    this.catClient.emit('cat_updated', { ...body, id });
    return 'Kafka message sent';
  }

  @Delete('/kafka/:id')
  async kafkaDelete(@Param('id') id: string) {
    this.catClient.emit('cat_deleted', id);
    return 'Kafka message sent';
  }
}
