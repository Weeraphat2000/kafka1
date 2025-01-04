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
import { ClientKafka } from '@nestjs/microservices';
import { log } from 'console';
import { firstValueFrom } from 'rxjs';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectModel(Cat.name) private readonly catModel: Model<Cat>,
    @Inject('CAT_SERVICE') private readonly catClient: ClientKafka,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
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
    // return {
    //   message: 'Cat deleted',
    // };
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
    // emit คือ ไม่รอ response จาก Microservice
    this.catClient.emit('cat_updated', { ...body, id });
    return 'Kafka message sent';
  }

  @Delete('/kafka/:id')
  async kafkaDelete(@Param('id') id: string) {
    this.catClient.emit('cat_deleted', id);
    return 'Kafka message sent';
  }

  @Post('/kafka3/test')
  async kafkaTest(@Body() body: any) {
    this.kafkaClient.emit('kafka3-test', body);
    return 'Kafka message sent';
  }

  @Post('/kafka2/kafka2-test-to-kafka3')
  kafka2TestToKafka3(@Body() body: any) {
    log('kafka2-test-to-kafka3', body);
    this.catClient.emit('kafka2-test-to-kafka3', body);
    return 'Kafka message sent';
  }

  @Get('ping')
  async pingMicroservice() {
    log('ping');

    // ส่งข้อความไป topic "demo-topic" แล้วรอรับ response แบบ RxJS
    // โดย firstValueFrom() จะดึงค่าครั้งแรกที่ emit กลับมาเป็น Promise
    // ต้องใช้กับ send() ใช้กับ emit() ไม่ได้
    const response = await firstValueFrom(
      this.kafkaClient.send('demo-topic', {
        message: 'Hello from API Gateway!',
      }),
    );

    // ส่ง response จาก Microservice กลับให้ client
    return {
      msg: 'API Gateway received microservice response',
      data: response,
    };
  }

  @Get('ping2')
  async pingMicroservice2() {
    log('ping2');

    // ส่งข้อความไป topic "ping2" แล้วรอรับ response แบบ RxJS
    // โดย firstValueFrom() จะดึงค่าครั้งแรกที่ emit กลับมาเป็น Promise
    const response = await firstValueFrom(
      this.catClient.send('ping2', {
        message: 'Hi Ping 2',
      }),
    );

    // ส่ง response จาก Microservice กลับให้ client
    return {
      msg: 'Ping 2 received microservice response',
      data: response,
    };
  }

  @Get('ping3')
  async pingMicroservice3() {
    log('ping3');

    // ส่งข้อความไป topic "ping3" แล้วรอรับ response แบบ RxJS
    // โดย firstValueFrom() จะดึงค่าครั้งแรกที่ emit กลับมาเป็น Promise
    const response = await firstValueFrom(
      this.catClient.send('ping3', {
        message: 'Hi Ping 3',
      }),
    );

    // ส่ง response จาก Microservice กลับให้ client
    return {
      msg: 'Ping 3 received microservice response',
      data: response,
    };
  }

  @Get('getAllCat')
  async getAllCat() {
    log('getAllCat');

    // ส่งข้อความไป topic "getAllCat" แล้วรอรับ response แบบ RxJS
    // โดย firstValueFrom() จะดึงค่าครั้งแรกที่ emit กลับมาเป็น Promise
    const response = await firstValueFrom(
      this.kafkaClient.send('getAllCat', {
        message: 'Get all cat',
      }),
    );

    // ส่ง response จาก Microservice กลับให้ client
    return {
      msg: 'Get all cat received microservice response',
      data: response,
    };
  }
}
