import readline from "readline"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

export const input = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    const ask = () => {
      rl.question(question, (answer) => {
        if (!answer.trim()) return ask()
        resolve(answer)
      })
    }
    ask()
  })
}

export const close = () => rl.close()