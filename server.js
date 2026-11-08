
require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const NASA_API_KEY = process.env.NASA_API_KEY;

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "S.O.P.I.A. está funcionando"
  });
});

app.post("/webhook", async (req, res) => {
  try {
    const intent =
      req.body.queryResult?.intent?.displayName;

    const parameters =
      req.body.queryResult?.parameters || {};

    console.log("Intent recibido:", intent);
    console.log("Parámetros:", parameters);

    if (intent === "SOPIA_searchasteroids") {
      const fechaOriginal = parameters.fecha;
      const fecha = fechaOriginal.substring(0, 10);

      if (!fecha) {
        return res.json({
          fulfillmentText:
            "¿Qué fecha quieres consultar?"
        });
      }

      if (!NASA_API_KEY) {
        throw new Error("Falta configurar NASA_API_KEY");
      }

      // Consultar asteroides en NASA NeoWs
      const url =
        "https://api.nasa.gov/neo/rest/v1/feed";

      const response = await axios.get(url, {
        params: {
          start_date: fecha,
          end_date: fecha,
          api_key: NASA_API_KEY
        },
        timeout: 10000
      });

      const asteroids =
        response.data.near_earth_objects[fecha] || [];

      if (asteroids.length === 0) {
        return res.json({
          fulfillmentText:
            `No se han encontrado asteroides registrados para el ${fecha}.`
        });
      }

      // Ordenar por diámetro máximo estimado
      asteroids.sort((a, b) => {
        const diameterA =
          a.estimated_diameter.kilometers
            .estimated_diameter_max;

        const diameterB =
          b.estimated_diameter.kilometers
            .estimated_diameter_max;

        return diameterB - diameterA;
      });

      const resultados = asteroids.slice(0, 5);

      let mensaje =
        ` He encontrado ${asteroids.length} asteroides ` +
        `cercanos a la Tierra para el ${fecha}:\n\n`;

      resultados.forEach((asteroid, index) => {
        const diameter =
          asteroid.estimated_diameter.kilometers
            .estimated_diameter_max;

        const approach =
          asteroid.close_approach_data[0];

        const distance = Number(
          approach.miss_distance.kilometers
        );

        mensaje +=
          `${index + 1}. ${asteroid.name}\n` +
          `Diámetro máximo estimado: ${diameter.toFixed(3)} km\n` +
          `Distancia de aproximación: ${distance.toLocaleString("es-ES", {
            maximumFractionDigits: 0
          })} km\n` +
          `Clasificado como potencialmente peligroso por NASA: ` +
          `${asteroid.is_potentially_hazardous_asteroid ? "Sí" : "No"}\n\n`;
      });

      const largest = resultados[0];

      mensaje +=
        `El de mayor diámetro estimado de esta lista es ` +
        `${largest.name}. `;

      return res.json({
        fulfillmentText: mensaje
      });
    }
        else if (intent === "SOPIA_astronomypicture") {

      if (!NASA_API_KEY) {
        throw new Error("Falta configurar NASA_API_KEY");
      }

      const response = await axios.get(
        "https://science.nasa.gov/wp-json/wp/v2/apod-basic",
        {
          params: {
            api_key: NASA_API_KEY
          },
          timeout: 15000
        }
      );

        const datosNASA = response.data;

        console.log("Respuesta APOD completa:", JSON.stringify(datosNASA, null, 2));

        const apod = Array.isArray(datosNASA)
        ? datosNASA[0]
        : datosNASA;

        console.log("Datos APOD:", apod);
        console.log("Campos recibidos:", Object.keys(apod || {}));

        if (!apod || !apod.title) {
        throw new Error("No se encuentra el campo title en la respuesta de NASA");
        }

      const explicacion = (apod.explanation || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 700);

      let fulfillmentText;

      if (apod.media_type === "video") {
        fulfillmentText =
          `Publicación astronómica de NASA: ${apod.title}\n\n` +
          `${explicacion}\n\n` +
          `Puedes ver el vídeo aquí: ${apod.url}`;
      } else {
        fulfillmentText =
          `¡Imagen astronómica del día!\n\n` +
          `Fecha: ${apod.date}\n` +
          `Título: ${apod.title}\n\n` +
          `Explicación: ${explicacion}\n\n` +
          `Imagen: ${apod.hdurl || apod.url}`;
      }

      if (apod.media_type === "video") {
  return res.json({
    fulfillmentText: fulfillmentText
  });
}

        
        return res.json({
        fulfillmentMessages: [
            {
            text: {
                text: [fulfillmentText]
            }
            },
            {
            payload: {
                richContent: [
                [
                    {
                    type: "image",
                    rawUrl: apod.hdurl || apod.url,
                    accessibilityText: apod.title
                    }
                ]
                ]
            }
            }
        ]
        });
    }

    else if (intent === "SOPIA_spacemissions") {

  const mission = parameters.mission;

  const missions = {
    "artemis": {
      name: "Programa Artemis",
      description: "Programa de NASA destinado a devolver astronautas a la Luna y preparar futuras misiones tripuladas a Marte."
    },
    "voyager": {
      name: "Voyager",
      description: "Las sondas Voyager 1 y 2 fueron lanzadas en 1977 para explorar los planetas exteriores y actualmente estudian el espacio interestelar."
    },
    "perseverance": {
      name: "Perseverance",
      description: "Rover de NASA que explora Marte desde 2021 y busca indicios de vida microbiana antigua."
    },
    "curiosity": {
      name: "Curiosity",
      description: "Rover de NASA que estudia la geología y las condiciones ambientales de Marte desde 2012."
    },
    "apollo 11": {
      name: "Apollo 11",
      description: "Misión histórica de 1969 en la que Neil Armstrong y Buzz Aldrin se convirtieron en los primeros seres humanos en caminar sobre la Luna."
    },
    "james webb": {
      name: "Telescopio Espacial James Webb",
      description: "Observatorio espacial que estudia las primeras galaxias, estrellas, exoplanetas y otros objetos del universo."
    },
    "hubble": {
      name: "Telescopio Espacial Hubble",
      description: "Observatorio espacial lanzado en 1990 que ha permitido realizar importantes descubrimientos sobre galaxias, estrellas y el universo."
    },
    "mmx": {
        name: "MMX (Martian Moons eXploration)",
        description:
            "La misión MMX de la agencia espacial japonesa JAXA " +
            "fue lanzada con éxito el 20 de octubre de 2026 " +
            "mediante un cohete H3 desde el Centro Espacial de Tanegashima, Japón.\n\n" +
            "Su objetivo principal es estudiar las dos lunas de Marte, " +
            "Fobos y Deimos, para investigar su origen y evolución.\n\n" +
            "La nave llegará al entorno de Marte en agosto de 2027 " +
            "y estudiará Fobos, donde desplegará el rover Idefix. " +
            "En 2030 está previsto recoger muestras de su superficie " +
            "y traerlas a la Tierra en 2031.\n\n" +
            "Será una misión histórica para investigar las lunas marcianas."
        }
  };

  if (!mission) {
    return res.json({
      fulfillmentText: "¿Qué misión espacial quieres consultar?"
    });
  }

  const key = String(mission).toLowerCase().trim();

  const selectedMission = missions[key];

  if (!selectedMission) {
    return res.json({
      fulfillmentText:
        `Todavía no tengo información detallada sobre ${mission}.`
    });
  }

  return res.json({
    fulfillmentText:
      `${selectedMission.name}\n\n` +
      `${selectedMission.description}`
  });
}

else if (intent === "SOPIA_searchmissionimages") {


  const mission = String(parameters.mission || "")
    .toLowerCase()
    .trim();

  if (mission === "mmx") {

    const imagenes = [
      {
        url: "https://www.mmx.jaxa.jp/images/gallery/photo01.jpg",
        title: "Nave MMX durante su preparación"
      },
      {
        url: "https://www.mmx.jaxa.jp/images/gallery/photo02.jpg",
        title: "Detalle de la nave MMX"
      }
    ];

    return res.json({
      fulfillmentMessages: [
        {
          text: {
            text: [
              "¡Aquí tienes imágenes oficiales de la misión MMX! 🚀\n\n" +
              "Fuente: JAXA (Agencia Japonesa de Exploración Aeroespacial).\n" +
              "Puedes consultar más fotografías en su galería: " +
              "https://www.mmx.jaxa.jp/en/gallery/"
            ]
          }
        },
        {
          payload: {
            richContent: [
              [
                {
                  type: "image",
                  rawUrl: imagenes[0].url,
                  accessibilityText: imagenes[0].title
                },
                {
                  type: "image",
                  rawUrl: imagenes[1].url,
                  accessibilityText: imagenes[1].title
                }
              ]
            ]
          }
        }
      ]
    });
  }
  else {

        const response = await axios.get(
            "https://images-api.nasa.gov/search",
            {
            params: {
                q: mission,
                media_type: "image",
                page_size: 5
            },
            timeout: 15000
            }
        );

        const items = response.data.collection.items || [];

        if (items.length === 0) {
            return res.json({
            fulfillmentText:
                `No he encontrado imágenes de ${mission} en la biblioteca de NASA.`
            });
        }

        const imagenes = items.slice(0, 3).map(item => ({
            title: item.data[0].title,
            description: (item.data[0].description || "")
            .replace(/<[^>]*>/g, "")
            .slice(0, 200),
            url: item.links?.find(link => link.rel === "preview")?.href
        })).filter(item => item.url);

        const richContent = imagenes.map(imagen => [
            {
            type: "image",
            rawUrl: imagen.url,
            accessibilityText: imagen.title
            },
            {
            type: "description",
            title: imagen.title,
            text: [imagen.description]
            }
        ]);

        return res.json({
            fulfillmentMessages: [
            {
                text: {
                text: [
                    `He encontrado imágenes de ${mission} en la biblioteca de NASA. 🌌`
                ]
                }
            },
            {
                payload: {
                richContent: richContent
                }
            }
            ]
        });
        }
}

    // Respuesta para intents todavía no conectados
    return res.json({
      fulfillmentText:
        "Soy S.O.P.I.A. El webhook está funcionando, " +
        "pero todavía no tengo conectada esa funcionalidad."
    });

  } catch (error) {
    console.error(
      "Error en el webhook:",
      error.response?.data || error.message
    );

    return res.json({
      fulfillmentText:
        "Lo siento, he tenido un problema al consultar " +
        "los datos astronómicos. Inténtalo de nuevo."
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `S.O.P.I.A. está escuchando en http://localhost:${PORT}`
  );
});
