export interface MenuItemVariant {
  id: string
  name: string
  price: number
  available: boolean
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  available?: boolean
  variants?: MenuItemVariant[]
}

export interface Category {
  id: string
  name: string
  icon: string
}

export const storeInfo = {
  name: "Rei dos Salgados",
  address: "Rua Governador Dinarte Mariz, 55",
  city: "Alto do Rodrigues - RN",
  state: "Rio Grande do Norte",
  phone: "(84) 9 9814-2418",
  whatsapp: "5584921511524",
  instagram: "@oreidossalgados9",
  about: "O melhor lanche da cidade? So aqui!",
  pixKey: "84921511524",
  paymentMethods: ["Cartao de Credito", "Cartao de Debito", "PIX", "Dinheiro"],
  hours: [
    { day: "Segunda", open: "15:30", close: "20:00" },
    { day: "Terca", open: "15:00", close: "20:00" },
    { day: "Quarta", open: "15:00", close: "20:00" },
    { day: "Quinta", open: "15:00", close: "20:00" },
    { day: "Sexta", open: "15:30", close: "20:00" },
    { day: "Sabado", open: "15:30", close: "20:00" },
    { day: "Domingo", open: "15:00", close: "20:00" },
  ],
  deliveryFees: [
    { neighborhood: "Centro", fee: 2.0 },
    { neighborhood: "Tabatinga", fee: 5.0 },
  ],
}

export const categories: Category[] = [
  { id: "salgados-fritos", name: "Salgados Fritos", icon: "flame" },
  { id: "salgados-assados", name: "Salgados Assados", icon: "cookie" },
  { id: "lanches", name: "Lanches", icon: "sandwich" },
  { id: "bebidas", name: "Bebidas", icon: "cup-soda" },
  { id: "combos", name: "Combos", icon: "package" },
]

export const menuItems: MenuItem[] = [
  // Salgados Fritos
  {
    id: "coxinha-frango",
    name: "Coxinha de Frango",
    description: "Coxinha crocante recheada com frango desfiado temperado",
    price: 5.0,
    image: "/images/coxinha.jpg",
    category: "salgados-fritos",
  },
  {
    id: "coxinha-catupiry",
    name: "Coxinha de Catupiry",
    description: "Coxinha cremosa com recheio de frango e catupiry",
    price: 6.0,
    image: "/images/coxinha.jpg",
    category: "salgados-fritos",
  },
  {
    id: "pastel-carne",
    name: "Pastel de Carne",
    description: "Pastel crocante recheado com carne moida temperada",
    price: 7.0,
    image: "/images/pastel.jpg",
    category: "salgados-fritos",
  },
  {
    id: "pastel-queijo",
    name: "Pastel de Queijo",
    description: "Pastel dourado com recheio de queijo derretido",
    price: 7.0,
    image: "/images/pastel.jpg",
    category: "salgados-fritos",
  },
  {
    id: "kibe",
    name: "Kibe",
    description: "Kibe frito tradicional, crocante por fora e macio por dentro",
    price: 5.0,
    image: "/images/kibe.jpg",
    category: "salgados-fritos",
  },
  {
    id: "risole-presunto",
    name: "Risole de Presunto",
    description: "Risole dourado recheado com presunto e queijo",
    price: 5.5,
    image: "/images/empada.jpg",
    category: "salgados-fritos",
  },
  // Salgados Assados
  {
    id: "esfiha-carne",
    name: "Esfiha de Carne",
    description: "Esfiha aberta com recheio de carne temperada",
    price: 5.0,
    image: "/images/esfiha.jpg",
    category: "salgados-assados",
  },
  {
    id: "esfiha-frango",
    name: "Esfiha de Frango",
    description: "Esfiha aberta com frango desfiado e temperos especiais",
    price: 5.0,
    image: "/images/esfiha.jpg",
    category: "salgados-assados",
  },
  {
    id: "empada-frango",
    name: "Empada de Frango",
    description: "Empada com massa amanteigada e recheio de frango",
    price: 6.0,
    image: "/images/empada.jpg",
    category: "salgados-assados",
  },
  {
    id: "empada-palmito",
    name: "Empada de Palmito",
    description: "Empada de massa fina recheada com palmito",
    price: 6.5,
    image: "/images/empada.jpg",
    category: "salgados-assados",
  },
  // Lanches
  {
    id: "hotdog-simples",
    name: "Hot Dog Simples",
    description: "Pao, salsicha, molhos, milho e batata palha",
    price: 8.0,
    image: "/images/hotdog.jpg",
    category: "lanches",
  },
  {
    id: "hotdog-completo",
    name: "Hot Dog Completo",
    description: "Hot dog com tudo: carne moida, queijo, bacon e mais",
    price: 12.0,
    image: "/images/hotdog.jpg",
    category: "lanches",
  },
  // Bebidas
  {
    id: "suco-laranja",
    name: "Suco de Laranja",
    description: "Suco de laranja natural, feito na hora",
    price: 6.0,
    image: "/images/suco.jpg",
    category: "bebidas",
  },
  {
    id: "suco-acerola",
    name: "Suco de Acerola",
    description: "Suco de acerola natural e refrescante",
    price: 6.0,
    image: "/images/suco.jpg",
    category: "bebidas",
  },
  {
    id: "refrigerante",
    name: "Refrigerante Lata",
    description: "Coca-Cola, Guarana ou Fanta - 350ml",
    price: 5.0,
    image: "/images/suco.jpg",
    category: "bebidas",
  },
  {
    id: "agua",
    name: "Agua Mineral",
    description: "Agua mineral 500ml - com ou sem gas",
    price: 3.0,
    image: "/images/suco.jpg",
    category: "bebidas",
  },
  // Combos
  {
    id: "combo-familia",
    name: "Combo Familia",
    description: "10 salgados variados + 1 refrigerante 2L",
    price: 45.0,
    image: "/images/hero-bg.jpg",
    category: "combos",
  },
  {
    id: "combo-lanche",
    name: "Combo Lanche",
    description: "3 salgados + 1 suco natural",
    price: 20.0,
    image: "/images/hero-bg.jpg",
    category: "combos",
  },
]
