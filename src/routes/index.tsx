import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import simCss from "@/simulador/simulador.css?url";
import capgoCss from "@/simulador/capgo.css?url";
import { SIMULADOR_MARKUP } from "@/simulador/markup";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cap!GO – Simulador do Consultor" },
      {
        name: "description",
        content:
          "Simule sua RV de graduação e a RVV de pós, suba de nível e acompanhe missões. Para consultores comerciais Estácio da regional Centro Sul.",
      },
      { property: "og:title", content: "Cap!GO – Simulador do Consultor" },
      {
        property: "og:description",
        content: "Entendeu a faixa. Entendeu o ganho. Veja quanto já conquistou, o que falta para a próxima faixa e o que priorizar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#25294e" },
    ],
    links: [
      { rel: "stylesheet", href: simCss },
      { rel: "stylesheet", href: capgoCss },
    ],
  }),
  component: Index,
});

function Index() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || el.dataset["init"]) return;
    el.dataset["init"] = "1";
    void import("@/simulador/engine").then((m) => m.initSimulador());
  }, []);

  return <div ref={root} dangerouslySetInnerHTML={{ __html: SIMULADOR_MARKUP }} />;
}
