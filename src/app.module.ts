import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Cat, CatSchema } from './schemas/cat.schemas';
import { ClientsModule, Transport } from '@nestjs/microservices';

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
          // consumer: {
          //   groupId: 'cat-consumer',
          // },
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
