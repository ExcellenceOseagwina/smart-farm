require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json());

// SERVE FRONTEND: This makes the "All-in-One" method work
app.use(express.static(path.join(__dirname, 'public')));

// 2. SUPABASE CONNECTION
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 3. FUZZY LOGIC CONFIGURATION
const fuzzyConfig = {
    moisture: {
        "Very Low": { 
            min: 0, max: 25, 
            status: "critically low and unsuitable for healthy crop growth", 
            rec: "Apply irrigation immediately to restore adequate soil moisture. Increase watering frequency gradually and monitor soil condition closely to prevent plant dehydration, wilting, and poor nutrient absorption" 
        },
        "Low": { 
            min: 15, max: 40, 
            status: "below the optimal level required for proper crop development", 
            rec: "Increase watering moderately and monitor soil moisture regularly to maintain stable growing conditions and improve nutrient availability for crops" 
        },
        "Medium": { 
            min: 30, max: 65, 
            status: "within the appropriate range for healthy crop growth", 
            rec: "Maintain the current watering schedule and continue regular monitoring to preserve balanced soil conditions for optimal crop performance" 
        },
        "High": { 
            min: 55, max: 85, 
            status: "above the recommended level and may lead to waterlogging", 
            rec: "Reduce irrigation temporarily and improve soil drainage to prevent root suffocation, fungal infections, and reduced oxygen availability in the soil" 
        },
        "Very High": { 
            min: 75, max: 100, 
            status: "excessively high and harmful to crop growth", 
            rec: "Stop watering immediately and implement proper drainage measures to remove excess water from the soil. Closely monitor crops for signs of root rot, disease development, and nutrient loss" 
        }
    },
    temperature: {
        "Very Low": { 
            min: -10, max: 15, 
            status: "extremely low and may significantly hinder crop growth and development", 
            rec: "Protect crops from cold stress by reducing exposure to low temperatures. Monitor environmental conditions closely and apply protective measures where necessary to minimize damage to plant tissues and slow growth" 
        },
        "Low": { 
            min: 10, max: 22, 
            status: "below the optimal range required for healthy crop development", 
            rec: "Monitor crop performance and environmental conditions regularly to ensure crops are not negatively affected by prolonged low temperature exposure" 
        },
        "Normal": { 
            min: 20, max: 32, 
            status: "within the suitable range for healthy crop growth", 
            rec: "Maintain current environmental conditions and continue regular monitoring to support stable crop development and productivity" 
        },
        "High": { 
            min: 30, max: 40, 
            status: "above the optimal range and may cause heat stress in crops", 
            rec: "Provide shade where possible and increase watering slightly to reduce heat stress, maintain plant hydration, and prevent excessive water loss through evaporation" 
        },
        "Very High": { 
            min: 38, max: 60, 
            status: "extremely high and dangerous to crop survival and productivity", 
            rec: "Apply immediate cooling measures such as increased irrigation, shading, and proper ventilation to reduce heat stress and prevent crop dehydration, leaf scorching, and reduced yield" 
        }
    },
    humidity: {
        "Very Low": { 
            min: 0, max: 30, 
            status: "extremely low and unsuitable for healthy crop development", 
            rec: "Increase watering and environmental moisture gradually to prevent excessive water loss from crops and reduce the risk of plant dehydration and poor growth" 
        },
        "Low": { 
            min: 25, max: 50, 
            status: "below the recommended range for stable crop growth", 
            rec: "Improve moisture conditions around crops through moderate watering and regular monitoring to maintain favorable environmental balance" 
        },
        "Normal": { 
            min: 45, max: 70, 
            status: "within the acceptable range for healthy crop growth", 
            rec: "Maintain current environmental conditions and continue monitoring to preserve suitable humidity levels for crop development" 
        },
        "High": { 
            min: 60, max: 85, 
            status: "above the optimal range and may encourage the spread of plant diseases", 
            rec: "Improve airflow and ventilation around crops to reduce excess moisture accumulation and minimize the risk of fungal infections and disease outbreaks" 
        },
        "Very High": { 
            min: 80, max: 100, 
            status: "excessively high and harmful to crop health", 
            rec: "Reduce environmental moisture immediately by improving ventilation, reducing excessive watering, and increasing air circulation to prevent severe disease development and crop damage" 
        }
    }
};

// 4. FUZZY MATH
function getDominantLevel(val, schema) {
    let candidates = [];
    for (let level in schema) {
        if (val >= schema[level].min && val <= schema[level].max) {
            candidates.push(level);
        }
    }
    if (candidates.length === 0) return Object.keys(schema)[0];
    if (candidates.length === 1) return candidates[0];
    const criticalityRank = { "Very Low": 4, "Very High": 4, "Low": 3, "High": 3, "Medium": 1, "Normal": 1 };
    let bestLevel = candidates[0];
    let minDistance = Infinity;
    candidates.forEach(level => {
        const center = (schema[level].min + schema[level].max) / 2;
        const distance = Math.abs(val - center);
        if (distance < minDistance) {
            minDistance = distance;
            bestLevel = level;
        } else if (distance === minDistance) {
            if (criticalityRank[level] > criticalityRank[bestLevel]) bestLevel = level;
        }
    });
    return bestLevel;
}

// 5. ANALYZE API ROUTE
app.post('/api/analyze', async (req, res) => {
    try {
        const { userId, moisture, temp, humidity } = req.body;
        const mLevel = getDominantLevel(moisture, fuzzyConfig.moisture);
        const tLevel = getDominantLevel(temp, fuzzyConfig.temperature);
        const hLevel = getDominantLevel(humidity, fuzzyConfig.humidity);

        const mData = fuzzyConfig.moisture[mLevel];
        const tData = fuzzyConfig.temperature[tLevel];
        const hData = fuzzyConfig.humidity[hLevel];

        let finalStatus = "";
        let finalRec = "";

        const isExtreme = (l) => l.includes("Very");
        if (isExtreme(mLevel) && isExtreme(tLevel) && isExtreme(hLevel)) {
            finalStatus = "Farm environmental conditions are extremely critical and highly unsuitable for crop growth. Soil moisture, temperature, and humidity are all at extreme levels.";
            finalRec = "Immediate intervention is required. Restore soil moisture balance, regulate temperature, and control humidity using appropriate environmental measures.";
        } else if (mLevel === "Medium" && tLevel === "Normal" && hLevel === "Normal") {
            finalStatus = "Farm conditions are optimal.";
            finalRec = "Maintain current environmental conditions and continue monitoring to support stable crop development and productivity.";
        } else {
            finalStatus = `Soil moisture is ${mData.status}, temperature is ${tData.status}, and humidity is ${hData.status}.`;
            finalRec = `${mData.rec}. ${tData.rec}. ${hData.rec}.`;
        }

        const { error } = await supabase.from('monitoring_records').insert([{
            user_id: userId,
            soil_moisture: moisture,
            temperature: temp,
            humidity: humidity,
            system_status: finalStatus,
            recommendation: finalRec
        }]);

        if (error) throw error;
        res.json({ status: finalStatus, recommendation: finalRec });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. HEALTH CHECK
app.get('/health', (req, res) => res.send("Server is ALIVE"));

// --- 7. START SERVER (CLOUD READY) ---
// We use process.env.PORT because Render will give us a specific port
const PORT = process.env.PORT || 3000;

// We remove '127.0.0.1' so it can listen on all network interfaces
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});