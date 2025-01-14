import { useEffect, useRef } from "react";
import { GraphingToolProps } from "../../types/tool-types"
import vegaEmbed from "vega-embed";

import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";


// Altair Declaration
export const RENDER_ALTAIR_DECLARATION: FunctionDeclaration = {
    name: "render_altair",
    description: "Displays an altair graph in json format.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            json_graph: {
                type: SchemaType.STRING,
                description: "JSON STRING representation of the graph to render. Must be a string, not a json object",
            }
        },
        required: ["json_graph"],
    },
};



function GraphingTool({ altairJson }: GraphingToolProps) {
    // State
    const embedRef = useRef<HTMLDivElement>(null);

    // Altair visualization effect
    useEffect(() => {
        if (embedRef.current && altairJson) {
            vegaEmbed(embedRef.current, JSON.parse(altairJson));
        }
    }, [altairJson]);

    return (
        <div>
            <div ref={embedRef} className="altair-visualization" />

            <div className="vega-embed" ref={embedRef} />
        </div>
    );
}

export default GraphingTool;
  