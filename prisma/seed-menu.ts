import { config } from "dotenv"
config({ path: ".env.local" })
config()

import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({ adapter })

type VariantInput = { name: string; price: number; available: boolean }

async function addItem(
  name: string,
  description: string,
  categoryId: string,
  variants: VariantInput[],
  image = "/images/hero-bg.jpg"
) {
  const price = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0
  const item = await prisma.menuItem.create({
    data: {
      name,
      description,
      price,
      image,
      categoryId,
    },
  })
  if (variants.length > 0) {
    await prisma.menuItemVariant.createMany({
      data: variants.map((v) => ({
        menuItemId: item.id,
        name: v.name,
        price: v.price,
        available: v.available,
      })),
    })
  }
  return item
}

async function main() {
  // Salgados
  await addItem(
    "X-Dogão",
    "Massa de pão recheado com salsicha, frango, presunto, queijo e requeijão cremoso.",
    "salgados",
    [{ name: "Tradicional", price: 7, available: true }]
  )
  await addItem(
    "Sanduíche Natural",
    "Pão de forma. Sabores: Patê de frango, Com alface.",
    "salgados",
    [
      { name: "Patê de frango", price: 6, available: true },
      { name: "Com alface", price: 6, available: true },
    ]
  )
  await addItem(
    "Torta salgada",
    "Recheado com frango, carne, presunto, queijo, milho verde e ervilha.",
    "salgados",
    [
      { name: "Tradicional", price: 4, available: true },
      { name: "Indisponível", price: 4, available: false },
    ]
  )
  await addItem(
    "Esfirra",
    "Esfirra assada.",
    "salgados",
    [
      { name: "Calabresa", price: 7, available: true },
      { name: "Calabresa com requeijão cremoso", price: 7, available: true },
      { name: "Frango", price: 7, available: true },
      { name: "Frango com requeijão cremoso", price: 7, available: true },
      { name: "Carne de sol", price: 7, available: true },
      { name: "Carne de sol com requeijão", price: 7, available: true },
    ]
  )
  await addItem(
    "X-tudo",
    "Massa de pão, com carne de hambúrguer, presunto, queijo, frango e requeijão cremoso.",
    "salgados",
    [{ name: "Misto", price: 7, available: true }]
  )
  await addItem(
    "Pão recheado",
    "Pão de massa pré-folhada com requeijão cremoso.",
    "salgados",
    [
      { name: "Pizza de calabresa (Calabresa, presunto, frango e queijo)", price: 5, available: true },
      { name: "Frango", price: 5, available: true },
      { name: "Carne de sol", price: 5, available: true },
      { name: "Misto (Frango, presunto e queijo)", price: 5, available: true },
    ]
  )
  await addItem("Queijada", "Queijada recheada com queijo.", "salgados", [
    { name: "Tradicional", price: 5, available: true },
  ])
  await addItem(
    "Folhado",
    "Massa folhada com requeijão cremoso.",
    "salgados",
    [
      { name: "Carne de sol", price: 5, available: true },
      { name: "Trouxinha (Frango)", price: 5, available: true },
    ]
  )
  await addItem(
    "Pastel de forno",
    "Pastel de forno com recheio de creme de Frango.",
    "salgados",
    [{ name: "Tradicional (Creme de Frango)", price: 4, available: true }]
  )
  await addItem("Empada", "Empada salgada.", "salgados", [
    { name: "Frango (Creme de frango)", price: 4, available: true },
    { name: "Carne de sol (Com requeijão cremoso)", price: 4, available: true },
  ])
  await addItem("Enroladinho", "Enroladinho.", "salgados", [
    { name: "Tradicional (Com salsicha)", price: 4, available: true },
  ])
  await addItem("Risole", "Risole frito.", "salgados", [
    { name: "Misto (Presunto, Queijo e Frango)", price: 4, available: true },
    { name: "Frango", price: 4, available: true },
    { name: "Carne de sol", price: 4, available: true },
  ])
  await addItem("Coxinha", "Coxinha crocante.", "salgados", [
    { name: "Frango", price: 4, available: true },
    { name: "Carne de sol", price: 4, available: true },
  ])

  // Bebidas
  await addItem(
    "Guaraná do Amazonas",
    "Coberturas: Chocolate, Morango, Uva, Doce de leite, Blue Ice, Açaí, Chiclete, Kiwi, Menta e Fini. Granulado, Castanha, Flocos de arroz.",
    "bebidas",
    [
      { name: "300 ml", price: 7, available: true },
      { name: "500 ml", price: 10, available: true },
    ]
  )
  await addItem("Refrigerante 1L", "1 litro.", "bebidas", [
    { name: "Coca Cola ZERO", price: 10, available: true },
    { name: "Coca Cola", price: 10, available: true },
    { name: "Guaraná", price: 10, available: true },
    { name: "Pepsi", price: 10, available: true },
    { name: "Sukita", price: 10, available: true },
  ])
  await addItem("Tampico", "Suco Tampico.", "bebidas", [
    { name: "Tampico", price: 4, available: true },
  ])
  await addItem("Nescau", "Achocolatado.", "bebidas", [
    { name: "Nescau", price: 4, available: true },
  ])
  await addItem("Kapo", "Sabores diversos.", "bebidas", [
    { name: "Uva", price: 4, available: true },
    { name: "Laranja", price: 4, available: true },
    { name: "Maracujá", price: 4, available: true },
    { name: "Morango", price: 4, available: true },
  ])
  await addItem("Refrigerante (Lata)", "Refrigerante em lata.", "bebidas", [
    { name: "Coca cola ZERO", price: 6, available: true },
    { name: "Coca cola", price: 6, available: true },
    { name: "Guaraná", price: 6, available: true },
    { name: "Fanta uva", price: 6, available: true },
    { name: "Fanta laranja", price: 6, available: true },
    { name: "Pepsi", price: 6, available: true },
    { name: "Sprite", price: 6, available: true },
    { name: "Sukita (Sabor Uva)", price: 6, available: true },
  ])
  await addItem("Refrigerante (Garrafinha)", "Refrigerante garrafinha.", "bebidas", [
    { name: "Coca cola", price: 4, available: true },
    { name: "Coca cola ZERO", price: 4, available: true },
    { name: "Guaraná", price: 4, available: true },
    { name: "Fanta uva", price: 4, available: true },
    { name: "Fanta laranja", price: 4, available: true },
    { name: "Sukita (sabor laranja)", price: 4, available: true },
    { name: "Pepsi", price: 4, available: true },
    { name: "Soda", price: 4, available: true },
  ])
  await addItem("São Geraldo", "Cajuina.", "bebidas", [
    { name: "Cajuina", price: 3, available: true },
  ])

  // Sobremesas
  await addItem(
    "Caixinha de brigadeiros sortidos",
    "Recebemos encomendas para eventos. Sabores: Tradicional, Branco, Ninho, Oreo, Ferrero Rocher, Beijinho, Coco Queimado, Doce de Leite, Churros e Nesquik (Moranguinho).",
    "sobremesas",
    [{ name: "Tradicional, Branco, Ninho, Oreo, Ferrero Rocher, Beijinho, Coco Queimado, Doce de Leite, Churros e Nesquik", price: 12, available: true }]
  )
  await addItem("Bolo de chocolate", "Massa fofinha de chocolate.", "sobremesas", [
    { name: "Chocolate", price: 5, available: true },
  ])
  await addItem("Empada Doce", "Empada doce.", "sobremesas", [
    { name: "Tradicional", price: 4, available: true },
    { name: "Brigadeiro", price: 5, available: true },
  ])

  console.log("Menu seed completed!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
