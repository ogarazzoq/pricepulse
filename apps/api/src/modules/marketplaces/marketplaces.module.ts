import { Global, Module } from '@nestjs/common';
import { MarketplacesController } from './marketplaces.controller';
import { MarketplacesService } from './marketplaces.service';
import { MarketplaceRegistry } from './marketplace.registry';
import { FakeStoreProvider } from './providers/fakestore.provider';
import { DummyJsonProvider } from './providers/dummyjson.provider';

@Global()
@Module({
  controllers: [MarketplacesController],
  providers: [MarketplacesService, MarketplaceRegistry, FakeStoreProvider, DummyJsonProvider],
  exports: [MarketplacesService, MarketplaceRegistry],
})
export class MarketplacesModule {}
