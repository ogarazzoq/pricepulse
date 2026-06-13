import { Global, Module } from '@nestjs/common';
import { MarketplacesController } from './marketplaces.controller';
import { MarketplacesService } from './marketplaces.service';
import { MarketplaceRegistry } from './marketplace.registry';
import { EnrichmentService } from './enrichment.service';
import { FakeStoreProvider } from './providers/fakestore.provider';
import { DummyJsonProvider } from './providers/dummyjson.provider';
// import { EscuelaJsProvider } from './providers/escuelajs.provider';  // Disabled
// import { OpenFoodFactsProvider } from './providers/openfoodfacts.provider';  // Disabled
import { BestBuyProvider } from './providers/bestbuy.provider';
import { OlchaProvider } from './providers/olcha.provider';
import { AmazonProvider } from './providers/amazon.provider';
import { KuaiProvider } from './providers/kuai.provider';
import { UpcItemDbEnricher } from './providers/upcitemdb.enricher';

@Global()
@Module({
  controllers: [MarketplacesController],
  providers: [
    MarketplacesService,
    MarketplaceRegistry,
    EnrichmentService,
    // Marketplace providers (Electronics & Tech only)
    FakeStoreProvider,
    DummyJsonProvider,
    // EscuelaJsProvider,  // Disabled - mixed products
    // OpenFoodFactsProvider,  // Disabled - food products only
    BestBuyProvider,
    OlchaProvider,
    AmazonProvider,
    KuaiProvider,
    // Enrichment providers
    UpcItemDbEnricher,
  ],
  exports: [MarketplacesService, MarketplaceRegistry, EnrichmentService],
})
export class MarketplacesModule {}
