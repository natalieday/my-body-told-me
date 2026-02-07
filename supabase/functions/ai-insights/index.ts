import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { userId, days = 30, question = null, contextData = null } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = await import("npm:@supabase/supabase-js@2.58.0").then(
      (module) => module.createClient(supabaseUrl, supabaseServiceKey)
    );

    if (question && contextData) {
      const { dailyLogs, momentLogs, conditions } = contextData;

      const dailyLogsText = dailyLogs
        .map(
          (log: any) =>
            `${log.date}: Severity ${log.overall_severity}/10, Sleep ${log.sleep_hours}h (quality ${log.sleep_quality}/5), Stress ${log.stress_level}/5, Activity ${log.activity_level}, Triggers: ${log.triggers || "none"}`
        )
        .join("\n");

      const momentLogsText = momentLogs
        .map(
          (log: any) =>
            `${log.timestamp}: Severity ${log.overall_severity}/10, Activity: ${log.activity || "none"}, Triggers: ${log.triggers || "none"}`
        )
        .join("\n");

      const conditionsText = conditions
        .map(
          (c: any) =>
            `${c.condition.name} (${c.status})${c.sub_symptoms?.length ? ` - Sub-symptoms: ${c.sub_symptoms.map((s: any) => s.name).join(", ")}` : ""}`
        )
        .join("\n");

      const prompt = `You are a helpful health insights assistant analyzing chronic illness tracking data. A user has asked: "${question}"

Here is their recent health data:

CONDITIONS:
${conditionsText}

DAILY LOGS (last 30 days):
${dailyLogsText}

MOMENT LOGS (recent):
${momentLogsText}

Based on this data, provide a clear, helpful answer to their question. Be specific and reference patterns in their data. If you don't have enough data to answer confidently, say so and explain what additional data would help.`;

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful health insights assistant. Be positive, specific, and actionable. Reference actual data points when possible.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });

      if (!openaiResponse.ok) {
        console.error("OpenAI API error:", await openaiResponse.text());
        return new Response(
          JSON.stringify({ error: "Failed to generate answer" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const openaiData = await openaiResponse.json();
      const answer =
        openaiData.choices?.[0]?.message?.content ||
        "Unable to generate an answer at this time.";

      return new Response(
        JSON.stringify({
          answer: answer,
          question: question,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const formattedStartDate = startDate.toISOString().split("T")[0];

    const { data: logs, error: logsError } = await supabase
      .from("daily_logs")
      .select(
        `
        id,
        date,
        overall_severity,
        sleep_hours,
        sleep_quality,
        stress_level,
        activity_level,
        food_notes,
        meds_notes,
        triggers,
        daily_log_conditions(
          severity,
          notes,
          user_condition:user_conditions(
            id,
            condition:conditions(name)
          )
        )
      `
      )
      .eq("user_id", userId)
      .gte("date", formattedStartDate)
      .order("date", { ascending: true });

    if (logsError) {
      console.error("Error fetching logs:", logsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user logs" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!logs || logs.length === 0) {
      const defaultInsight =
        "No logs found yet. Start logging your symptoms to see insights!";
      await supabase.from("ai_insights").insert({
        user_id: userId,
        insights_text: defaultInsight,
        insight_date: new Date().toISOString().split("T")[0],
      });

      return new Response(
        JSON.stringify({
          insights: defaultInsight,
          logsAnalyzed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const dataForPrompt = logs
      .map(
        (log: any) =>
          `Date: ${log.date}
  Overall Severity: ${log.overall_severity}/10
  Sleep: ${log.sleep_hours}h (quality ${log.sleep_quality}/5)
  Stress: ${log.stress_level}/5
  Activity: ${log.activity_level}
  Food: ${log.food_notes || "None"}
  Meds: ${log.meds_notes || "None"}
  Triggers: ${log.triggers || "None"}
  Conditions: ${log.daily_log_conditions.map((c: any) => `${c.user_condition.condition.name} (${c.severity}/10)${c.notes ? " - " + c.notes : ""}`).join(", ") || "None"}`
      )
      .join("\n\n");

    const prompt = `Analyze the following chronic illness tracking data and provide 3-6 key insights about symptoms, patterns, and potential triggers. Format your response as bullet points. Focus on:
- Correlations between sleep and symptoms
- Stress and symptom patterns
- Activity levels and flare-ups
- Potential food triggers
- Environmental or situational triggers
- Any positive patterns

End with 2-3 actionable experiments the user can try.

Data:
${dataForPrompt}`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful health insights assistant analyzing chronic illness tracking data. Be positive and actionable.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      console.error("OpenAI API error:", await openaiResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to generate insights" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const insights =
      openaiData.choices?.[0]?.message?.content ||
      "Unable to generate insights at this time.";

    await supabase.from("ai_insights").insert({
      user_id: userId,
      insights_text: insights,
      insight_date: new Date().toISOString().split("T")[0],
    });

    return new Response(
      JSON.stringify({
        insights: insights,
        logsAnalyzed: logs.length,
        daysAnalyzed: days,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});