// include libraries
const readXlsxFile = require("read-excel-file/node");
const fs = require("fs");
const { Configuration, OpenAIApi } = require("openai");

// delcares schema of converted json file
const schema = {
  Name: {
    prop: "name",
    type: String,
  },
  "Token Symbol": {
    prop: "tokenSymbol",
    type: String,
  },
  Date: {
    prop: "date",
    type: Date,
  },
  Released: {
    prop: "released",
    type: String,
  },
  Price: {
    prop: "price",
    type: Number,
  },
  "7d Change": {
    prop: "weekChange",
    type: Number,
  },
  "30d Change": {
    prop: "monthChange",
    type: Number,
  },
  "Market Cap": {
    prop: "marketCap",
    type: Number,
  },
  Volume: {
    prop: "volume",
    type: Number,
  },
  Supply: {
    prop: "supply",
    type: String,
  },
  Description: {
    prop: "description",
    type: String,
  },
};

const configuration = new Configuration({
  apiKey: "OPENAI_API_KEY",
});
const model = "text-davinci-003";
const openai = new OpenAIApi(configuration);

// read excel file & prepare dataset
readXlsxFile("./given.xlsx", { schema }).then(async ({ rows, errors }) => {
  const dataset = [];

  // prompt as possible customer question, completion as answer
  await rows.forEach(async (row) => {
    const text = `This is Zk-Rollup named ${row.name}. Token symbol of ${
      row.name
    } is ${row.tokenSymbol}. ${
      row.tokenSymbol
    } was last taken on ${row.date.toDateString()}. ${row.tokenSymbol} has${
      row.released === "Yes" ? "" : " not"
    } been released. Price of ${row.tokenSymbol} is ${
      row.price
    }$. Price change of ${row.tokenSymbol} in last week is ${(
      row.weekChange * 100
    ).toFixed(2)}%. Price change of ${row.tokenSymbol} in last month is ${(
      row.monthChange * 100
    ).toFixed(2)}%. Total market value (Market Cap) of ${
      row.tokenSymbol
    }'s circulating supply is ${
      row.marketCap
    }$. Trading amount(Volume) traded in the last 24 hours is ${
      row.volume
    }$. Amount of coins circulating in market and public hands of ${
      row.tokenSymbol
    } is ${row.supply}. ${row.description}\n\n`;

    fs.appendFileSync("zkrollup.txt", text);

    // Generates question by using OpenAI
    const questionResponse = await openai.createCompletion({
      model,
      prompt: `Write questions based on the text below\n\nText: ${text}\n\nQuestions:1.`,
      temperature: 0,
      max_tokens: 257,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["\n\n"],
    });

    const questions = "1." + questionResponse.data.choices[0].text;

    // Generates answers from generated questions
    const answerResponse = await openai.createCompletion({
      model,
      prompt: `Write answer based on the text below\n\nText: ${text}\n\nQuestions:\n${questions}\n\nAnswers:\n1.`,
      temperature: 0,
      max_tokens: 257,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["\n\n"],
    });

    const answers = "1." + answerResponse.data.choices[0].text;

    // Converts generated quetions & answers to array
    const questionList = questions
      .split("\n")
      .map((item) => item.split(". ")[1]);
    const answersList = answers.split("\n").map((item) => item.split(". ")[1]);

    // prepare datasets & save as jsonl
    for (let i = 0; i < questionList.length; ++i) {
      const prompt = `Bot: Hello! I'm a chatbot that can help you with your zk-rollup token investments. What zk-rollup tokens are you interested in learning more about? Please provide the token name or your question about the tokens.\nUser: ${questionList[i]}\nBot:`;

      const completion = `${answersList[i]}`;

      try {
        fs.appendFileSync(
          "zkrollupinfo.jsonl",
          JSON.stringify({ prompt, completion }) + "\n",
          (err) => {
            if (err) throw err;
          }
        );
      } catch (err) {
        console.log(err);
      }
    }
  });
});
