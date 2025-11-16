import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Bot, 
  User, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles,
  MessageSquare,
  BookOpen
} from "lucide-react";
import { BackButton } from "@/components/BackButton";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  retrievedContext?: Array<{
    id: string;
    title: string;
    category: string;
    similarity: number;
  }>;
  wasHelpful?: boolean;
  createdAt: string;
}

interface ChatResponse {
  conversationId: string;
  message: Message;
  retrievedContext: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    similarity: number;
  }>;
}

export default function SmartAssistantPage() {
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showContext, setShowContext] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await apiRequest("POST", "/api/assistant/chat", {
        conversationId,
        message: userMessage,
        language: "ar",
      });
      return await response.json() as ChatResponse;
    },
    onMutate: async (userMessage) => {
      // Optimistically add user message
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: userMessage,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMessage]);
      setMessage("");
    },
    onSuccess: (data) => {
      // Update conversation ID if new
      if (!conversationId) {
        setConversationId(data.conversationId);
      }
      
      // Replace temp user message and add assistant response
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-"));
        return [
          ...withoutTemp,
          {
            id: `user-${Date.now()}`,
            role: "user" as const,
            content: message,
            createdAt: new Date().toISOString(),
          },
          {
            ...data.message,
            wasHelpful: undefined,
          },
        ];
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الإرسال",
        description: error.message || "فشل في إرسال الرسالة",
        variant: "destructive",
      });
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
    },
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ messageId, helpful }: { messageId: string; helpful: boolean }) => {
      await apiRequest("POST", "/api/assistant/feedback", { messageId, helpful });
    },
    onSuccess: (_, variables) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === variables.messageId
            ? { ...msg, wasHelpful: variables.helpful }
            : msg
        )
      );
      toast({
        title: "شكراً لتقييمك!",
        description: "تقييمك يساعدنا على تحسين الخدمة",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    const messageToSend = message;
    sendMessageMutation.mutate(messageToSend);
  };

  const handleFeedback = (messageId: string, helpful: boolean) => {
    feedbackMutation.mutate({ messageId, helpful });
  };

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setMessage("");
  };

  // Suggested questions
  const suggestedQuestions = [
    "ما هو نظام حماية البيانات الشخصية؟",
    "كيف أتعامل مع طلبات أصحاب البيانات؟",
    "ما الفرق بين جهة التحكم وجهة المعالجة؟",
    "متى يجب إجراء تقييم الأثر DPIA؟",
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <BackButton />
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                المساعد الذكي
              </h1>
              <p className="text-muted-foreground">
                اسأل عن نظام حماية البيانات الشخصية والامتثال
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  المحادثة
                </CardTitle>
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNewChat}
                    data-testid="button-new-chat"
                  >
                    محادثة جديدة
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Messages */}
              <ScrollArea className="h-[600px] p-6" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Bot className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      مرحباً! كيف يمكنني مساعدتك؟
                    </h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      أنا مساعدك الذكي المتخصص في نظام حماية البيانات الشخصية
                      السعودي. اسألني أي سؤال!
                    </p>
                    
                    {/* Suggested Questions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                      {suggestedQuestions.map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="text-right justify-start h-auto py-3 px-4"
                          onClick={() => {
                            setMessage(question);
                            sendMessageMutation.mutate(question);
                          }}
                          data-testid={`button-suggested-${index}`}
                        >
                          <span className="text-sm">{question}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {messages.map((msg, index) => (
                      <div
                        key={msg.id || index}
                        className={`flex gap-3 ${
                          msg.role === "user" ? "flex-row-reverse" : ""
                        }`}
                        data-testid={`message-${msg.role}-${index}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <User className="w-5 h-5" />
                          ) : (
                            <Bot className="w-5 h-5" />
                          )}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 space-y-2">
                          <div
                            className={`rounded-lg p-4 ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground mr-12"
                                : "bg-muted ml-12"
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                            </p>
                          </div>

                          {/* Context & Feedback for Assistant */}
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-3 mr-12">
                              {/* Feedback Buttons */}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 ${
                                    msg.wasHelpful === true
                                      ? "text-green-600"
                                      : ""
                                  }`}
                                  onClick={() => handleFeedback(msg.id, true)}
                                  disabled={msg.wasHelpful !== undefined}
                                  data-testid={`button-helpful-${index}`}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`h-8 ${
                                    msg.wasHelpful === false
                                      ? "text-red-600"
                                      : ""
                                  }`}
                                  onClick={() => handleFeedback(msg.id, false)}
                                  disabled={msg.wasHelpful !== undefined}
                                  data-testid={`button-not-helpful-${index}`}
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </Button>
                              </div>

                              {/* Show Context */}
                              {msg.retrievedContext && msg.retrievedContext.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setShowContext(
                                      showContext === msg.id ? null : msg.id
                                    )
                                  }
                                  data-testid={`button-context-${index}`}
                                >
                                  <BookOpen className="w-4 h-4 ml-1" />
                                  المصادر ({msg.retrievedContext.length})
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Retrieved Context */}
                          {msg.role === "assistant" &&
                            showContext === msg.id &&
                            msg.retrievedContext && (
                              <div className="mr-12 space-y-2">
                                <p className="text-sm text-muted-foreground font-medium">
                                  المصادر المستخدمة:
                                </p>
                                {msg.retrievedContext.map((ctx, ctxIndex) => (
                                  <div
                                    key={ctx.id}
                                    className="bg-background border rounded-lg p-3"
                                    data-testid={`context-${index}-${ctxIndex}`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-medium">
                                        {ctx.title}
                                      </p>
                                      <Badge variant="secondary" className="text-xs">
                                        {Math.round(ctx.similarity * 100)}%
                                      </Badge>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {ctx.category}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}

                    {/* Loading Indicator */}
                    {sendMessageMutation.isPending && (
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                            <div
                              className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            />
                            <div
                              className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="اكتب سؤالك هنا..."
                    className="flex-1"
                    disabled={sendMessageMutation.isPending}
                    data-testid="input-message"
                  />
                  <Button
                    type="submit"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    data-testid="button-send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 المساعد يستخدم الذكاء الاصطناعي وقد يرتكب أخطاء. تحقق من
                  المعلومات المهمة.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info Sidebar */}
          <div className="space-y-6">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">عن المساعد الذكي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  مساعد ذكي متخصص في نظام حماية البيانات الشخصية السعودي (PDPL)
                  يستخدم تقنية الذكاء الاصطناعي للإجابة على أسئلتك.
                </p>
                <Separator />
                <div className="space-y-2">
                  <p className="font-medium">ما يمكنني مساعدتك به:</p>
                  <ul className="space-y-1 text-muted-foreground mr-4">
                    <li>• شرح مواد نظام PDPL</li>
                    <li>• توضيح متطلبات الامتثال</li>
                    <li>• الإجابة عن ROPA و DSAR و DPIA</li>
                    <li>• إرشادك لاستخدام المولدات</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">نصائح للاستخدام</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>✓ اطرح أسئلة واضحة ومحددة</p>
                <p>✓ استخدم اللغة العربية للنتائج الأفضل</p>
                <p>✓ راجع المصادر المستخدمة في كل إجابة</p>
                <p>✓ قيّم الإجابات لمساعدتنا على التحسين</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
