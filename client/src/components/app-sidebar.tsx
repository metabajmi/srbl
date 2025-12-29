import { Link, useLocation } from "wouter";
import { Shield, FileText, CheckSquare, ScrollText, Home, FileSearch, Cookie, Sparkles, FileEdit, Users, ShieldAlert, X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "الصفحة الرئيسية",
    url: "/",
    icon: Home,
  },
];

const toolsItems = [
  {
    title: "المساعد الذكي",
    url: "/smart-assistant",
    icon: Sparkles,
  },
  {
    title: "مُولّد سياسة الخصوصية",
    url: "/privacy-generator",
    icon: FileText,
  },
  {
    title: "الشروط والأحكام",
    url: "/terms-generator",
    icon: ScrollText,
  },
  {
    title: "إدارة الموافقة",
    url: "/consent-management",
    icon: CheckSquare,
  },
  {
    title: "إعدادات الخصوصية",
    url: "/preferences-center",
    icon: Cookie,
  },
];

const complianceItems = [
  {
    title: "سجل أنشطة المعالجة",
    url: "/ropa",
    icon: FileEdit,
  },
  {
    title: "طلبات أصحاب البيانات",
    url: "/dsar",
    icon: Users,
  },
  {
    title: "تقييم تأثير حماية البيانات",
    url: "/dpia",
    icon: ShieldAlert,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar side="right">
      <SidebarHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline hover-elevate rounded-md px-2 py-1.5" data-testid="link-home">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">سِرْبَال</h1>
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            data-testid="button-close-sidebar"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>التنقل الرئيسي</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.url.replace('/', '') || 'home'}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>الأدوات</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.url.replace('/', '')}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>الامتثال الداخلي</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {complianceItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-${item.url.replace('/', '')}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
