import { Product, Client, Supplier, PurchaseVoucher, SalesVoucher } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    code: '1016359848131',
    designation: 'CASQUE HOCO W55 .',
    prixVente1: 3900,
    prixVente2: 3800,
    prixVente3: 3700,
    stock: 15,
    stockColis: 2,
    category: 'ACCESSOIRES',
    prixAchat: 3000,
    prixDeRevient: 3000
  },
  {
    code: '1010714334765',
    designation: 'GLASS ESD A07/ A36 A16 OG',
    prixVente1: 500,
    prixVente2: 450,
    prixVente3: 400,
    stock: 120,
    stockColis: 10,
    category: 'ACCESSOIRES',
    prixAchat: 300,
    prixDeRevient: 300
  },
  {
    code: '1001065430947',
    designation: 'INFINIX XPAD 20 4/128',
    prixVente1: 30300,
    prixVente2: 30100,
    prixVente3: 29900,
    stock: 5,
    stockColis: 1,
    category: 'TELEPHONES',
    prixAchat: 28000,
    prixDeRevient: 28000
  },
  {
    code: '1011879070659',
    designation: 'CABLE MICRO X89',
    prixVente1: 400,
    prixVente2: 350,
    prixVente3: 300,
    stock: 80,
    stockColis: 7,
    category: 'ACCESSOIRES',
    prixAchat: 200,
    prixDeRevient: 200
  },
  {
    code: '1007289312670',
    designation: 'CABLE TYPEC HDMI',
    prixVente1: 2200,
    prixVente2: 2100,
    prixVente3: 2000,
    stock: 25,
    stockColis: 3,
    category: 'ACCESSOIRES',
    prixAchat: 1500,
    prixDeRevient: 1500
  },
  {
    code: '1007398064682',
    designation: 'OTG HOCO UA17 TC',
    prixVente1: 900,
    prixVente2: 850,
    prixVente3: 800,
    stock: 50,
    stockColis: 5,
    category: 'ACCESSOIRES',
    prixAchat: 600,
    prixDeRevient: 600
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'client-anonyme',
    code: 'CLI-0001',
    name: 'Anonyme',
    balance: 0,
    address: 'Alger'
  },
  {
    id: 'client-abdou',
    code: 'CLI-0002',
    name: 'ABDOU',
    balance: 125000,
    address: 'Alger',
    contact: '0550112233'
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    code: 'FOUR-0001',
    name: 'HOCO ALGERIE',
    balance: 45000,
    address: 'Sidi M\'hamed'
  },
  {
    id: 'sup-2',
    code: 'FOUR-0002',
    name: 'DISNEY ACCESS',
    balance: 12000,
    address: 'Bab Ezzouar'
  }
];

export const INITIAL_PURCHASES: PurchaseVoucher[] = [];

export const INITIAL_SALES: SalesVoucher[] = [
  {
    id: '3425',
    date: '22/06/2026',
    time: '15:54:44',
    client: 'Anonyme',
    type: 'VENTE',
    itemsCount: 6,
    colisCount: 0,
    amount: 38200,
    remise: 0,
    totalHT: 38200,
    tva: 0,
    timbre: 0,
    ttc: 38200,
    versement: 38200,
    oldBalance: 0,
    newBalance: 0,
    items: [
      { id: 'item-1', code: '1016359848131', designation: 'CASQUE HOCO W55 .', colisage: 12, nbreColis: 0, pieces: 1, qty: 1, price: 3900, total: 3900 },
      { id: 'item-2', code: '1010714334765', designation: 'GLASS ESD A07/ A36 A16 OG', colisage: 12, nbreColis: 0, pieces: 1, qty: 1, price: 500, total: 500 },
      { id: 'item-3', code: '1001065430947', designation: 'INFINIX XPAD 20 4/128', colisage: 12, nbreColis: 0, pieces: 1, qty: 1, price: 30300, total: 30300 },
      { id: 'item-4', code: '1011879070659', designation: 'CABLE MICRO X89', colisage: 12, nbreColis: 0, pieces: 1, qty: 1, price: 400, total: 400 },
      { id: 'item-5', code: '1007289312670', designation: 'CABLE TYPEC HDMI', colisage: 12, nbreColis: 0, pieces: 1, qty: 1, price: 2200, total: 2200 },
      { id: 'item-6', code: '1007398064682', designation: 'OTG HOCO UA17 TC', colisage: 12, nbreColis: 0, pieces: 1, qty: 1, price: 900, total: 900 }
    ],
    vendeur: '<Aucun>',
    observations: ''
  }
];
