import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Cat, CatSchema } from './schemas/cat.schemas';
import { ClientKafka, ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }]),
    ConfigModule.forRoot({
      isGlobal: true, // ทำให้ ConfigModule ใช้ได้ทั่วทั้งแอป
      envFilePath: '.env', // ระบุไฟล์ .env (ค่าเริ่มต้นคือ .env)
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    ClientsModule.register([
      {
        name: 'CAT_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'cat', // เพื่อเอาไว้ดู log ใน Kafka ง่ายขึ้น ว่าเป็น client ไหน
            brokers: ['localhost:9092'],
          },
          // consumer คือ บ่งบอกว่าเราจะใช้ Kafka ในการรับข้อมูล (ฝั่ง consumer)
          consumer: {
            groupId: 'cat-consumer',
          },
        },
      },
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: ['localhost:9092'], // ระบุ broker ของ Kafka
          },
          consumer: {
            groupId: 'gateway-consumer-group', // ตั้งชื่อ Consumer Group ไม่ให้ชนกับ Microservice
          },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
// export class AppModule {}
export class AppModule implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    @Inject('CAT_SERVICE') private readonly catClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // บอก NestJS ว่าเราจะ subscribe response ของ topic 'demo-topic'
    this.kafkaClient.subscribeToResponseOf('demo-topic');
    this.kafkaClient.subscribeToResponseOf('getAllCat');

    this.catClient.subscribeToResponseOf('ping2');
    this.catClient.subscribeToResponseOf('ping3');

    // ควรทำการ connect ให้เสร็จ
    await this.kafkaClient.connect();
    await this.catClient.connect();
  }
}
