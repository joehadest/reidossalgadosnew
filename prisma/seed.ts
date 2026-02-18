import { config } from "dotenv"
config({ path: ".env.local" })
config()

import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error("DATABASE_URL is not set")

const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const store = await prisma.store.upsert({
    where: { id: "default-store" },
    update: {},
    create: {
      id: "default-store",
      name: "Rei dos Salgados",
      address: "Rua Governador Dinarte Mariz, 55",
      city: "Alto do Rodrigues - RN",
      state: "Rio Grande do Norte",
      phone: "(84) 9 9814-2418",
      whatsapp: "5584921511524",
      instagram: "@oreidossalgados9",
      about: "O melhor lanche da cidade? So aqui!",
      pixKey: "84921511524",
    },
  })

  const defaultHours = [
    { day: "Segunda", open: "15:30", close: "20:00" },
    { day: "Terca", open: "15:00", close: "20:00" },
    { day: "Quarta", open: "15:00", close: "20:00" },
    { day: "Quinta", open: "15:00", close: "20:00" },
    { day: "Sexta", open: "15:30", close: "20:00" },
    { day: "Sabado", open: "15:30", close: "20:00" },
    { day: "Domingo", open: "15:00", close: "20:00" },
  ]

  for (const h of defaultHours) {
    await prisma.storeHour.upsert({
      where: {
        storeId_day: { storeId: store.id, day: h.day },
      },
      update: { open: h.open, close: h.close },
      create: {
        storeId: store.id,
        day: h.day,
        open: h.open,
        close: h.close,
      },
    })
  }

  const paymentMethods = [
    "Cartao de Credito",
    "Cartao de Debito",
    "PIX",
    "Dinheiro",
  ]
  for (const name of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: {
        storeId_name: { storeId: store.id, name },
      },
      update: {},
      create: { storeId: store.id, name },
    })
  }

  const deliveryFees = [
    { neighborhood: "Centro", fee: 2.0 },
    { neighborhood: "Tabatinga", fee: 5.0 },
  ]
  for (const f of deliveryFees) {
    await prisma.deliveryFee.upsert({
      where: {
        storeId_neighborhood: {
          storeId: store.id,
          neighborhood: f.neighborhood,
        },
      },
      update: { fee: f.fee },
      create: {
        storeId: store.id,
        neighborhood: f.neighborhood,
        fee: f.fee,
      },
    })
  }

  const categoriesData = [
    { id: "salgados-fritos", name: "Salgados Fritos", icon: "flame" },
    { id: "salgados-assados", name: "Salgados Assados", icon: "cookie" },
    { id: "lanches", name: "Lanches", icon: "sandwich" },
    { id: "bebidas", name: "Bebidas", icon: "cup-soda" },
    { id: "combos", name: "Combos", icon: "package" },
  ]
  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    })
  }

  const menuItemsData = [
    { id: "coxinha-frango", name: "Coxinha de Frango", description: "Coxinha crocante recheada com frango desfiado temperado", price: 5.0, image: "/images/coxinha.jpg", category: "salgados-fritos" },
    { id: "coxinha-catupiry", name: "Coxinha de Catupiry", description: "Coxinha cremosa com recheio de frango e catupiry", price: 6.0, image: "/images/coxinha.jpg", category: "salgados-fritos" },
    { id: "pastel-carne", name: "Pastel de Carne", description: "Pastel crocante recheado com carne moida temperada", price: 7.0, image: "/images/pastel.jpg", category: "salgados-fritos" },
    { id: "pastel-queijo", name: "Pastel de Queijo", description: "Pastel dourado com recheio de queijo derretido", price: 7.0, image: "/images/pastel.jpg", category: "salgados-fritos" },
    { id: "kibe", name: "Kibe", description: "Kibe frito tradicional, crocante por fora e macio por dentro", price: 5.0, image: "/images/kibe.jpg", category: "salgados-fritos" },
    { id: "risole-presunto", name: "Risole de Presunto", description: "Risole dourado recheado com presunto e queijo", price: 5.5, image: "/images/empada.jpg", category: "salgados-fritos" },
    { id: "esfiha-carne", name: "Esfiha de Carne", description: "Esfiha aberta com recheio de carne temperada", price: 5.0, image: "/images/esfiha.jpg", category: "salgados-assados" },
    { id: "esfiha-frango", name: "Esfiha de Frango", description: "Esfiha aberta com frango desfiado e temperos especiais", price: 5.0, image: "/images/esfiha.jpg", category: "salgados-assados" },
    { id: "empada-frango", name: "Empada de Frango", description: "Empada com massa amanteigada e recheio de frango", price: 6.0, image: "/images/empada.jpg", category: "salgados-assados" },
    { id: "empada-palmito", name: "Empada de Palmito", description: "Empada de massa fina recheada com palmito", price: 6.5, image: "/images/empada.jpg", category: "salgados-assados" },
    { id: "hotdog-simples", name: "Hot Dog Simples", description: "Pao, salsicha, molhos, milho e batata palha", price: 8.0, image: "/images/hotdog.jpg", category: "lanches" },
    { id: "hotdog-completo", name: "Hot Dog Completo", description: "Hot dog com tudo: carne moida, queijo, bacon e mais", price: 12.0, image: "/images/hotdog.jpg", category: "lanches" },
    { id: "suco-laranja", name: "Suco de Laranja", description: "Suco de laranja natural, feito na hora", price: 6.0, image: "/images/suco.jpg", category: "bebidas" },
    { id: "suco-acerola", name: "Suco de Acerola", description: "Suco de acerola natural e refrescante", price: 6.0, image: "/images/suco.jpg", category: "bebidas" },
    { id: "refrigerante", name: "Refrigerante Lata", description: "Coca-Cola, Guarana ou Fanta - 350ml", price: 5.0, image: "/images/suco.jpg", category: "bebidas" },
    { id: "agua", name: "Agua Mineral", description: "Agua mineral 500ml - com ou sem gas", price: 3.0, image: "/images/suco.jpg", category: "bebidas" },
    { id: "combo-familia", name: "Combo Familia", description: "10 salgados variados + 1 refrigerante 2L", price: 45.0, image: "/images/hero-bg.jpg", category: "combos" },
    { id: "combo-lanche", name: "Combo Lanche", description: "3 salgados + 1 suco natural", price: 20.0, image: "/images/hero-bg.jpg", category: "combos" },
  ]

  for (const item of menuItemsData) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        categoryId: item.category,
      },
    })
  }

  console.log("Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
