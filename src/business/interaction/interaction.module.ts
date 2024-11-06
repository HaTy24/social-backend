import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Interaction, InteractionSchema } from './interaction.model';
import { InteractionService } from './interaction.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Interaction.name,
        schema: InteractionSchema,
      },
    ]),
  ],
  providers: [InteractionService],
  exports: [InteractionService],
})
export class InteractionModule {}
