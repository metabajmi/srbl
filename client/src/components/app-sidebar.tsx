import { Link, useLocation } from "wouter";
import { Shield, FileText, CheckSquare, ScrollText, ClipboardList, Home, FileSearch } from "lucide-react";
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
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "الصفحة الرئيسية",
    url: "/",
    icon: Home,
  },
  {
    title: "فحص الامتثال",
    url: "/scans",
    icon: FileSearch,
  },
];

const toolsItems = [
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
    title: "الامتثال الداخلي",
    url: "/internal-compliance",
    icon: ClipboardList,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 border-b">
        <Link href="/" className="flex items-center gap-3 no-underline hover-elevate rounded-md px-2 py-1.5" data-testid="link-home">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-base font-bold text-foreground">أداة الامتثال</h1>
        </Link>
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
      </SidebarContent>
    </Sidebar>
  );
}
