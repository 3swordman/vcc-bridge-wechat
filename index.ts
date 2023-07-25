import { Message, Room, WechatyBuilder } from "wechaty"
import { createBuilder, Builder } from "vcc_bot"
import readlinePromises from "readline/promises"

const wechaty = WechatyBuilder.build({
  name: "vcc-bridge-wechat"
})
wechaty
  .on("scan", (qrcode, status) => {
    console.log(`Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`)
  })
  .on("login", user => {
    console.log(`User logged in`)
  })
  .on("message", onMessageReceived)

const vccToWechatMap: Record<number, Room> = {}

let vcc: Builder | undefined
const rl = readlinePromises.createInterface(process.stdin, process.stdout)
;(async () => {
  vcc = await createBuilder({
    url: await rl.question("What is the url of the vcc server to connect? "),
    authType: (await rl.question("Wanna login or register? ")) as "login" | "register",
    username: await rl.question("What's your username? "),
    password: await rl.question("What's your password? ")
  })
  await wechaty.start()
  vcc.updateChats()
  vcc.onMessage = async ({ chat, username, msg, uid }) => {
    if (uid == -1) return
    console.log({ chat, username, msg })
    const room = vccToWechatMap[chat]
    if (!room) return
    await room.say(`${username}: ${msg}`)
  }
})()

const bindRegex = /\/bind (\d+)/

async function onMessageReceived(msg: Message) {
  if (msg.self()) return
  if (msg.type() != wechaty.Message.Type.Text) return
  const room = msg.room()
  if (!room) return
  const text = msg.text()
  const bindChat = bindRegex.exec(text)?.[1]
  console.log({ bindChat })
  if (!vcc) return
  if (bindChat) {
    try {
      const chat = parseInt(bindChat)
      if (!vcc.chats.getChatByID(chat)) {
        await vcc.chats.join(chat)
      }
      await room.say("Bind successfully! ")
      vccToWechatMap[chat] = room
    } catch (e) {
      await room.say("Operation failed. ")
    }
  } else {
    console.log({ vccToWechatMap })
    const chatString = Object.entries(vccToWechatMap).find(value => value[1].id == room.id)?.[0]
    console.log({ chatString })
    if (!chatString) return
    const chatNumber = parseInt(chatString, 10)
    console.log({ chatNumber })
    const chat = vcc.chats.getChatByID(chatNumber)
    console.log({ chat })
    if (!chat) return
    chat.sendMessage(msg.talker().name(), text)
  }
}
