// pnpm run test --detectOpenHandles --forceExit

import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Cat, CatSchema } from './schemas/cat.schemas';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { INestApplication, ValidationPipe } from '@nestjs/common';

describe('AppController', () => {
  let appController: AppController;
  let app: INestApplication; // เก็บอินสแตนซ์ของแอปเพื่อนำไปปิดภายหลัง

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forFeature([{ name: Cat.name, schema: CatSchema }]),
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        MongooseModule.forRoot(process.env.MONGO_URI),
        ClientsModule.register([
          {
            name: 'CAT_SERVICE',
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'cat',
                brokers: ['localhost:9092'],
              },
            },
          },
        ]),
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    appController = app.get<AppController>(AppController);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('root', () => {
    it('should return "Hello Kafka!"', () => {
      expect(appController.getHello()).toBe('Hello Kafka!');
    });

    it('should return cats', async () => {
      expect(await appController.getCats()).toBeInstanceOf(Array);
    });

    it('should return create cat success', async () => {
      const cat = await appController.createCat({
        name: 'test',
        age: 1,
        breed: 'test123',
      });
      const id = cat._id.toString();

      expect(await appController.getById(id)).toMatchObject(cat.toObject());

      await appController.deleteCat(id);
    });

    it('should fail if required fields are missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/cats') // endpoint ที่คอนโทรลเลอร์ฟังอยู่
        .send({ name: 'test' });

      expect(response.body.message).toContain(
        'age must be a number conforming to the specified constraints',
      );
      expect(response.body.message).toContain('breed must be a string');
    });

    it('should fail if field types are invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/cats') // endpoint ที่คอนโทรลเลอร์ฟังอยู่
        .send({ name: 'test', age: '1', breed: 1 });

      // ต้องถูกทั้งคู่
      expect(response.body.message).toContain('breed must be a string');
      expect(response.body.message).toContain(
        'age must be a number conforming to the specified constraints',
      );
    });

    it('should fail if find the cat by id not found', async () => {
      const nonExistentId = '64a5eec3c96e4a3f9e7b1234'; // Example ID
      const response = await request(app.getHttpServer()).get(
        '/cats/' + nonExistentId,
      );

      expect(response.body.message).toBe('Cat not found');
    });

    it('should update the cat successfully', async () => {
      const cat = await request(app.getHttpServer())
        .post('/cats') // endpoint ที่คอนโทรลเลอร์ฟังอยู่
        .send({ name: 'test', age: 1, breed: 'test' });

      const response = await request(app.getHttpServer())
        .patch('/cats/' + cat.body._id)
        .send({ name: 'test', age: 2, breed: 'test' });

      expect(response.body.age).toBe(2);
      await appController.deleteCat(cat.body._id);
    });

    it('should fail if update the cat by id not found', async () => {
      const nonExistentId = '64a5eec3c96e4a3f9e7b1234'; // Example ID
      const response = await request(app.getHttpServer())
        .patch('/cats/' + nonExistentId)
        .send({ name: 'test', age: 2, breed: 'test' });

      expect(response.body.message).toBe('Cat not found');
    });

    it('should fail if update the cat by invalid id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/cats/invalidId')
        .send({ name: 'test', age: 2, breed: 'test' });

      expect(response.body.message).toBe('Invalid ID format');
    });

    it('should fail if update the cat by invalid body type', async () => {
      const cat = await request(app.getHttpServer())
        .post('/cats') // endpoint ที่คอนโทรลเลอร์ฟังอยู่
        .send({ name: 'test', age: 1, breed: 'test' });

      const response = await request(app.getHttpServer())
        .patch('/cats/' + cat.body._id)
        .send({ name: 'test', age: 'invalidAge', breed: 'test' });

      expect(response.body.message).toContain(
        'age must be a number conforming to the specified constraints',
      );

      await appController.deleteCat(cat.body._id);
    });

    it('should fail if delete the cat by invalid id', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/cats/invalidId',
      );

      expect(response.body.message).toBe('Invalid ID format');
    });

    it('should delete the cat successfully', async () => {
      const cat = await request(app.getHttpServer())
        .post('/cats') // endpoint ที่คอนโทรลเลอร์ฟังอยู่
        .send({ name: 'test', age: 1, breed: 'test' });

      const response = await request(app.getHttpServer()).delete(
        '/cats/' + cat.body._id,
      );

      expect(response.body).toMatchObject(cat.body);
    });

    it('should fail if delete the cat by id not found', async () => {
      const nonExistentId = '64a5eec3c96e4a3f9e7b1234'; // Example ID
      const response = await request(app.getHttpServer()).delete(
        '/cats/' + nonExistentId,
      );

      expect(response.body.message).toBe('Cat not found');
    });
  });
});
