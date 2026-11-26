import type { Order } from '../types';
import { mapMagentoOrder } from './magento.mapper';
import { mapMeliOrder } from './meli.mapper';
import type { RawOrderEnvelope } from './raw.types';
import { mapTrayOrder } from './tray.mapper';
import { mapVtexOrder } from './vtex.mapper';

/** Ponto único de entrada da camada anticorrupção. */
export function mapRawOrder(envelope: RawOrderEnvelope): Order {
  switch (envelope.channel) {
    case 'vtex':
      return mapVtexOrder(envelope);
    case 'mercadolivre':
      return mapMeliOrder(envelope);
    case 'magento':
      return mapMagentoOrder(envelope);
    case 'tray':
      return mapTrayOrder(envelope);
  }
}

export type { RawOrderEnvelope, RawPayload } from './raw.types';
