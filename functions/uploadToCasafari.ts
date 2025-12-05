import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { jsonData, endpoint } = await req.json();

        if (!jsonData) {
            return Response.json({ error: 'JSON data is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get("CASAFARI_API_KEY");
        if (!apiKey) {
            return Response.json({ error: 'CASAFARI_API_KEY not configured' }, { status: 500 });
        }

        // Default endpoint or custom one
        const apiEndpoint = endpoint || 'https://api.casafari.com/v1/properties';

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(jsonData)
        });

        const responseText = await response.text();
        let responseData;
        
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = { raw: responseText };
        }

        if (!response.ok) {
            return Response.json({
                success: false,
                status: response.status,
                statusText: response.statusText,
                error: responseData
            }, { status: response.status });
        }

        return Response.json({
            success: true,
            status: response.status,
            data: responseData
        });

    } catch (error) {
        console.error("Error uploading to Casafari:", error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});