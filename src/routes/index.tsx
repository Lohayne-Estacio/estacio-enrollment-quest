import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import simCss from "@/simulador/simulador.css?url";
import { SIMULADOR_MARKUP } from "@/simulador/markup";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulador do Consultor – Modo Game" },
      {
        name: "description",
        content:
          "Simule sua RV de graduação e a RVV de pós, suba de nível e acompanhe missões. Para consultores comerciais Estácio da regional Centro Sul.",
      },
      { property: "og:title", content: "Simulador do Consultor – Modo Game" },
      {
        property: "og:description",
        content: "Cada matrícula vira dinheiro na tela: níveis, missões, Radar do ganho e resumo para o 1:1.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#262a4d" },
    ],
    links: [{ rel: "stylesheet", href: simCss }],
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
