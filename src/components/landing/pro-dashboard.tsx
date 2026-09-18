"use client";

import {
  Activity,
  ArrowLeft,
  Check,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
} from "lucide-react";
import BarChart from "@/components/animata/graphs/bar-chart";
import { BrandLogo } from "@/components/landing/brand-logo";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import {
  AnimatedSidebar,
  AnimatedSidebarContent,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupContent,
  AnimatedSidebarHeader,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuButton,
  AnimatedSidebarMenuItem,
  AnimatedSidebarProvider,
} from "@/components/motion/animated-sidebar";
import {
  AnimatedToastStack,
  type AnimatedToast,
} from "@/components/motion/animated-toast-stack";
import { NumberTicker } from "@/components/motion/number-ticker";
import { Card, CardContent } from "@/components/ui/card";
import { Safari } from "@/components/ui/safari";
import { brand, dashboard, request, type StoryStep } from "./story-data";
import { AnimatePresence, motion } from "motion/react";

type View = "overview" | "requests" | "detail";

function Sidebar({ view }: { view: View }) {
  const items = [
    { label: "Vue d’ensemble", icon: LayoutDashboard, active: view === "overview" },
    { label: "Demandes", icon: FileText, active: view !== "overview", badge: "1" },
    { label: "Activité", icon: Activity, active: false },
    { label: "Paramètres", icon: Settings, active: false },
  ];

  return (
    <AnimatedSidebar
      collapsible="none"
      ariaLabel="Navigation de l’espace établissement"
      panelClassName="dashboard-sidebar-panel"
    >
      <AnimatedSidebarHeader className="dashboard-partner">
        <BrandLogo className="dashboard-partner-logo" />
        <small>Établissement partenaire</small>
      </AnimatedSidebarHeader>
      <AnimatedSidebarContent>
        <AnimatedSidebarGroup>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {items.map(({ label, icon: Icon, active, badge }) => (
                <AnimatedSidebarMenuItem key={label}>
                  <AnimatedSidebarMenuButton
                    icon={<Icon size={16} />}
                    isActive={active}
                    badge={badge ? <span className="sidebar-count">{badge}</span> : undefined}
                    className="dashboard-nav-button"
                  >
                    {label}
                  </AnimatedSidebarMenuButton>
                </AnimatedSidebarMenuItem>
              ))}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      </AnimatedSidebarContent>
    </AnimatedSidebar>
  );
}

function CompactTopbar({ view }: { view: View }) {
  return (
    <div className="dashboard-mobile-nav">
      <BrandLogo className="dashboard-mobile-logo" />
      <span>{view === "overview" ? "Vue d’ensemble" : view === "requests" ? "Demandes" : `#${request.id}`}</span>
      <button type="button" aria-label="Ouvrir la navigation de l’espace établissement">
        <Menu size={17} />
      </button>
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  note,
}: {
  label: string;
  value: number;
  suffix?: string;
  note: string;
}) {
  return (
    <Card className="kpi-card">
      <CardContent>
        <div className="kpi-label"><span>{label}</span></div>
        <NumberTicker
          value={value}
          suffix={suffix}
          format={(number) => new Intl.NumberFormat("fr-FR").format(number)}
          startOnView={false}
          className="kpi-value"
        />
        <p>{note}</p>
      </CardContent>
    </Card>
  );
}

function Overview({ received, final }: { received: boolean; final: boolean }) {
  const receivedCount = received ? dashboard.receivedAfter : dashboard.receivedBefore;
  const completed = final ? dashboard.completedAfter : dashboard.completedBefore;
  const balance = final ? dashboard.balanceAfter : dashboard.balanceBefore;

  return (
    <div className="dashboard-page overview-page">
      <div className="dashboard-heading">
        <div><h2>Vue d’ensemble</h2><p>Suivi de la demande de démonstration</p></div>
      </div>
      <div className="kpi-grid">
        <KpiCard
          label="Demandes reçues"
          value={receivedCount}
          note={received ? `#${request.id} intégrée` : "En attente de transmission"}
        />
        <KpiCard
          label="Terminées"
          value={completed}
          note={final ? `#${request.id} clôturée` : "Traitement à venir"}
        />
        <KpiCard
          label="Solde de démonstration"
          value={balance}
          suffix=" FCFA"
          note={final ? "Conséquence de la demande" : "Avant résolution"}
        />
      </div>
      <Card className="chart-card">
        <CardContent>
          <div className="chart-head">
            <div><h3>Activité cette semaine</h3><p>Flux journalier des demandes confirmées</p></div>
          </div>
          <div className="chart-wrap">
            <BarChart
              height={126}
              items={dashboard.weeklyValues.map((progress, index) => {
                const isLast = index === dashboard.weeklyValues.length - 1;
                const val = isLast ? (final ? progress : Math.max(22, progress - 46)) : progress;
                return {
                  progress: val,
                  label: `${dashboard.weeklyDays[index]} : ${val}%`,
                  className: isLast && final ? "chart-bar chart-bar-active" : "chart-bar",
                };
              })}
            />
            <div className="chart-days">
              {dashboard.weeklyDays.map((day, idx) => (
                <span key={day} className={idx === dashboard.weeklyDays.length - 1 && final ? "active-day" : ""}>
                  {day}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PrimaryRequest() {
  return (
    <Card className="dashboard-request primary-request">
      <CardContent>
        <div>
          <strong>#{request.id}</strong>
          <AnimatedBadge status="success" size="sm">Reçue</AnimatedBadge>
          <b>12 500 FCFA</b>
        </div>
        <p><em>Reçue à l’instant</em><span>•</span>{request.venue}<small>Priorité haute</small></p>
      </CardContent>
    </Card>
  );
}

function PlaceholderRequest({ status }: { status: "En traitement" | "Terminée" }) {
  return (
    <Card className="dashboard-request muted-request">
      <CardContent>
        <div>
          <strong>Demande précédente</strong>
          <AnimatedBadge status={status === "Terminée" ? "neutral" : "warning"} size="sm">{status}</AnimatedBadge>
        </div>
        <p>Donnée synthétique<span>•</span>{request.venue}</p>
      </CardContent>
    </Card>
  );
}

function Requests({ prioritized }: { prioritized: boolean }) {
  return (
    <div className="dashboard-page requests-page">
      <div className="dashboard-heading">
        <div><h2>Demandes</h2><p>Suivi des flux entrants</p></div>
        <span className="active-requests"><i /> 1 demande active</span>
      </div>
      <div className="request-list" data-prioritized={prioritized || undefined}>
        {prioritized ? <PrimaryRequest /> : null}
        <PlaceholderRequest status="En traitement" />
        <PlaceholderRequest status="Terminée" />
        {!prioritized ? <PrimaryRequest /> : null}
      </div>
    </div>
  );
}

function Detail({ processing }: { processing: boolean }) {
  return (
    <div className="dashboard-page detail-page" data-processing={processing || undefined}>
      <div className="detail-back"><ArrowLeft size={15} /> Retour aux demandes</div>
      <div className="detail-title">
        <h2>Demande #{request.id}</h2>
        <AnimatedBadge status={processing ? "loading" : "success"} size="sm">
          {processing ? "En traitement" : "Reçue"}
        </AnimatedBadge>
        <strong>12 500 FCFA</strong>
      </div>
      <div className="accepted-banner">
        <CheckCircle2 size={22} />
        <p><strong>{processing ? "Demande acceptée" : "Demande reçue"}</strong><span>{processing ? "La prise en charge a commencé." : "Prête à être ouverte."}</span></p>
        <em>{processing ? "Prise en charge active" : "À traiter"}</em>
      </div>
      <Card className="progress-card">
        <CardContent>
          <h3>Progression du traitement</h3>
          <div className="progress-line"><i /><i /><i /></div>
          <div className="progress-labels">
            <span><strong>Reçue</strong><small>{request.createdAt}</small></span>
            <span><strong>En traitement</strong><small>{processing ? "En cours" : "À venir"}</small></span>
            <span><strong>Terminée</strong><small>En attente</small></span>
          </div>
        </CardContent>
      </Card>
      <Card className="detail-card">
        <CardContent>
          <h3>Détails de la demande</h3>
          <dl>
            <div><dt>Référence</dt><dd>#{request.id}</dd></div>
            <div><dt>Sélection</dt><dd>{request.option}</dd></div>
            <div><dt>Créée</dt><dd>À {request.createdAt}</dd></div>
            <div><dt>Canal</dt><dd>Application ToutCi</dd></div>
            <div><dt>Établissement</dt><dd>{request.venue}</dd></div>
            <div><dt>Montant</dt><dd>12 500 FCFA</dd></div>
          </dl>
        </CardContent>
      </Card>
      <div className="detail-footer">
        <button type="button" aria-disabled="true"><Check size={14} /> Marquer comme terminée</button>
      </div>
    </div>
  );
}

export function ProDashboard({ step, className }: { step: StoryStep; className?: string }) {
  const view: View = step === 10 || step === 11 ? "requests" : step === 12 || step === 13 ? "detail" : "overview";
  const received = step >= 9;
  const prioritized = step >= 11;
  const processing = step >= 13;
  const final = step >= 14;
  const toastByStep: Partial<Record<StoryStep, AnimatedToast>> = {
    9: {
      id: "request-received",
      status: "success",
      title: "Nouvelle demande reçue",
      description: "#D-2048 rejoint le tableau de bord en direct.",
      duration: 0,
      dismissible: false,
    },
    10: {
      id: "request-in-list",
      status: "info",
      title: "Flux des demandes",
      description: "#D-2048 intégrée dans la liste des commandes.",
      duration: 0,
      dismissible: false,
    },
    11: {
      id: "request-prioritized",
      status: "info",
      title: "Demande prioritaire",
      description: "#D-2048 remonte en tête pour prise en charge.",
      duration: 0,
      dismissible: false,
    },
    12: {
      id: "request-opened",
      status: "loading",
      title: "Détails de la demande",
      description: "Consultation de la commande #D-2048.",
      duration: 0,
      dismissible: false,
    },
    13: {
      id: "request-processing",
      status: "loading",
      title: "Traitement en cours",
      description: "La commande est en cours de préparation.",
      duration: 0,
      dismissible: false,
    },
    14: {
      id: "request-completed",
      status: "success",
      title: "Demande clôturée",
      description: "Commande terminée avec succès.",
      duration: 0,
      dismissible: false,
    },
    15: {
      id: "balance-updated",
      status: "success",
      title: "Solde actualisé",
      description: "+12 500 FCFA crédités au compte partenaire.",
      duration: 0,
      dismissible: false,
    },
  };
  const toast = toastByStep[step];

  return (
    <Safari
      url={view === "detail" ? `${brand.proBaseUrl}/demandes/${request.id}` : `${brand.proBaseUrl}/tableau-de-bord`}
      className={`dashboard-browser ${className ?? ""}`}
      aria-label={`Espace établissement ${brand.name}`}
    >
      <div className="dashboard-shell">
        <CompactTopbar view={view} />
        <AnimatedSidebarProvider
          defaultOpen
          style={{ "--sidebar-width": "12.5rem", "--sidebar-width-icon": "3.5rem" }}
          className="dashboard-sidebar-provider"
        >
          <Sidebar view={view} />
          <main className="dashboard-main">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="dashboard-view-pane"
              >
                {view === "overview" ? (
                  <Overview received={received} final={final} />
                ) : view === "requests" ? (
                  <Requests prioritized={prioritized} />
                ) : (
                  <Detail processing={processing} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </AnimatedSidebarProvider>
        {toast ? (
          <AnimatedToastStack
            toasts={[toast]}
            portal={false}
            placement="absolute"
            position="bottom-right"
            className="dashboard-toast"
            classNames={{
              surface: "dashboard-toast-surface",
              title: "dashboard-toast-title",
              description: "dashboard-toast-description",
            }}
          />
        ) : null}
      </div>
    </Safari>
  );
}
