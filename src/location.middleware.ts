import express from "express";
import OpenAI from "openai";
import openWeatherService from "./openWeather.service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const handleRequiresAction = async (
  run: any,
  threadId: string,
  weatherData: any
) => {
  if (
    run.required_action &&
    run.required_action.submit_tool_outputs &&
    run.required_action.submit_tool_outputs.tool_calls
  ) {
    const toolOutputs = run.required_action.submit_tool_outputs.tool_calls.map(
      (tool: any) => {
        if (tool.function.name === "get_result") {
          return {
            tool_call_id: tool.id,
            output: JSON.stringify(weatherData),
          };
        }
      }
    );

    if (toolOutputs.length > 0) {
      run = await openai.beta.threads.runs.submitToolOutputsAndPoll(
        threadId,
        run.id,
        { tool_outputs: toolOutputs }
      );
    }
    return handleRunStatus(run, threadId);
  }
};

const handleRunStatus: any = async (run: any, threadId: string) => {
  if (run.status === "completed") {
    let messages = await openai.beta.threads.messages.list(threadId);
    const resultMessage: any = messages.data.find((message: any, next: any) => {
      return (
        message.role === "assistant" &&
        message.content[0].text.value &&
        !message.content[0].text.value.includes("latitude")
      );
    });
    if (resultMessage) {
      return JSON.parse(resultMessage.content[0].text.value);
    }
    return "";
  }
  return run.status
};

const openaiMiddleware = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const prompt = req.body.prompt;
    // const openWeatherResponse = openWeatherService().getWeatherData(
    //   "-20.4637",
    //   "-54.6167"
    // );
    const assistant = await openai.beta.assistants.retrieve(
      "asst_D8Xgte2QdfQwqoCjGk1TGccU"
    );
    const thread = await openai.beta.threads.create();
    const message = openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: prompt,
    });
    console.log('Running first run...', prompt)
    let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
      tool_choice: "none",
      instructions:
        "Find a place from the user prompt, and send the latitude and longitude as a json, if nothing is found, return null.",
    });

    if (run.status === "completed") {
      const messages: any = await openai.beta.threads.messages.list(
        run.thread_id
      );
      for (const message of messages.data.reverse()) {
        const response = message?.content[0]?.text?.value;
        if (response && message.role === "assistant") {
          const parsedResponse = JSON.parse(response);
          if (!!parsedResponse?.latitude && !!parsedResponse?.longitude) {
            console.log('Running open weather request...', parsedResponse)
            const openWeatherResponse =
              await openWeatherService().getWeatherData(
                parsedResponse.latitude,
                parsedResponse.longitude
              );
            if (openWeatherResponse) {
              console.log('Running assistant function...', openWeatherResponse)
              let secondRun = await openai.beta.threads.runs.createAndPoll(
                thread.id,
                {
                  assistant_id: assistant.id,
                  tool_choice: {
                    type: "function",
                    function: {
                      name: "get_result",
                    },
                  },
                  instructions:
                    JSON.stringify(openWeatherResponse) + " json format",
                }
              );
              console.log('Finished second run')
              const result = await handleRequiresAction(
                secondRun,
                thread.id,
                prompt
              );
              console.log('Result: ', result)
              res.status(200).send(result);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
  next();
};

export default openaiMiddleware;
