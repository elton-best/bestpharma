import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { navAdmin, navPrincipale, type ItemNav } from "@/components/navigation";

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const chemin = useRouterState({ select: (r) => r.location.pathname });

  const groupe = (label: string, items: ItemNav[]) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => (
            <SidebarMenuItem key={it.url}>
              <SidebarMenuButton asChild isActive={chemin === it.url} tooltip={it.titre} className="h-10">
                <Link to={it.url} onClick={() => setOpenMobile(false)}>
                  <it.icone />
                  <span>{it.titre}</span>
                </Link>
              </SidebarMenuButton>
              {it.sprint ? <SidebarMenuBadge className="text-[10px] opacity-60">{it.sprint}</SidebarMenuBadge> : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
            +
          </span>
          <span className="font-display text-base font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            BEGPHARMA
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groupe("Officine", navPrincipale)}
        {groupe("Administration", navAdmin)}
      </SidebarContent>
    </Sidebar>
  );
}
