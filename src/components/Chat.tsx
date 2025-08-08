import { useChatbot } from "@/contexts/ChatContext";
import { useChat } from "ai/react";
import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatMessages from "./ChatMessages";
import ChatSuggestions from "./ChatSuggestions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/Accordion";

export default function Chat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    append,
    isLoading,
    error,
  } = useChat();

  const { isVisible } = useChatbot();

  return (
    isVisible && (
      <Accordion type="single" collapsible className="flexs relative z-40">
        <AccordionItem
          value="item-1"
          className="fixed bottom-8 right-8 w-80 rounded-md border bg-background"
        >
          <AccordionTrigger className="border-b px-6">
            <ChatHeader />
          </AccordionTrigger>
          <AccordionContent className="flex max-h-96 min-h-80 flex-col justify-between p-0">
            <ChatMessages
              messages={messages}
              error={error}
              isLoading={isLoading}
            />
            {messages.length === 0 && (
              <ChatSuggestions
                suggestions={[
                  "What projects has Vansh worked on?",
                  "What skills does Vansh have?",
                  "Does Vansh have experience in Generative AI?",
                ]}
                onSelectSuggestion={(s) =>
                  append({ role: "user", content: s })
                }
              />
            )}
            <ChatInput
              input={input}
              handleSubmit={handleSubmit}
              handleInputChange={handleInputChange}
              setMessages={setMessages}
              isLoading={isLoading}
              messages={messages}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  );
}
