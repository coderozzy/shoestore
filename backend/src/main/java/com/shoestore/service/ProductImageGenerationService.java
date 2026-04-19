package com.shoestore.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shoestore.config.AiImageProperties;
import com.shoestore.dto.GenerateProductImageRequest;
import com.shoestore.dto.GenerateProductImageResponse;
import com.shoestore.dto.ImageDataRequest;
import com.shoestore.exception.BadRequestException;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductImageGenerationService {

    private static final Map<String, List<String>> CITY_LANDMARKS = Map.of(
            "Istanbul", List.of(
                    "the cobblestone streets of Galata",
                    "the pavements of Istiklal Avenue",
                    "the narrow streets of Karakoy",
                    "the walking path by the Bosphorus in Bebek",
                    "the busy streets of Kadikoy",
                    "the historic streets of Balat",
                    "the luxury streets of Nisantasi",
                    "the seafront promenade of Moda",
                    "the streets near Galataport",
                    "the waterfront promenade of Ortakoy",
                    "the elegant streets of Etiler",
                    "the trendy cafes district of Cihangir",
                    "the art galleries area of Tophane",
                    "the vintage shops streets of Cukurcuma",
                    "the hipster neighborhood of Yeldegirmeni",
                    "the marina walkway of Fenerbahce",
                    "the peaceful streets of Arnavutkoy",
                    "the upscale avenues of Bagdat Caddesi",
                    "the historic bazaar streets near Grand Bazaar",
                    "the artsy backstreets of Beyoglu",
                    "the bohemian alleys of Asmalimescit",
                    "the seaside path of Salacak with Maiden's Tower view",
                    "the leafy streets of Emirgan",
                    "the modern walkways of Zorlu Center",
                    "the garden paths of Macka Park",
                    "the waterfront of Kabatas ferry terminal",
                    "the historic Pera streets",
                    "the designer boutiques of Tesvikiye",
                    "the colorful streets of Fener",
                    "the sunset promenade of Uskudar",
                    "the quiet streets of Kuzguncuk",
                    "the lively nightlife streets of Besiktas",
                    "the cultural district of Sultanahmet",
                    "the modern district of Levent",
                    "the seaside cafes of Rumeli Hisari",
                    "the trendy rooftops area of Karakoy",
                    "the antique district streets of Horhor",
                    "the waterfront path of Yenikoy",
                    "the chic neighborhood of Akaretler",
                    "the panoramic terrace streets of Pierre Loti",
                    "the ferry pier area of Eminonu",
                    "the luxury marina of Bebek",
                    "the artistic quarter of Bomonti"
            ),
            "Paris", List.of(
                    "the classic boulevards of central Paris",
                    "the rainy streets of Le Marais",
                    "the Montmartre cobblestone alleyways",
                    "the sidewalks of the Latin Quarter",
                    "the wide pavements of Champs-Elysees",
                    "the elegant streets near Palais Royal",
                    "the artsy neighborhood of Saint-Germain-des-Pres",
                    "the romantic bridges over Seine River",
                    "the cafe terraces of Place des Vosges",
                    "the luxury boutiques of Avenue Montaigne",
                    "the cobblestone paths near Sacre-Coeur",
                    "the fashion district of Rue du Faubourg Saint-Honore",
                    "the art deco streets of the 7th arrondissement",
                    "the lively terraces of Bastille",
                    "the peaceful Luxembourg Gardens pathways",
                    "the designer stores of Rue de Rivoli",
                    "the hidden passages of Galerie Vivienne",
                    "the riverside walk near Pont Alexandre III",
                    "the sunset views from Trocadero esplanade",
                    "the literary cafes of Saint-Michel",
                    "the flower markets of Ile de la Cite",
                    "the jazz clubs area of Pigalle",
                    "the modern walkways of La Defense",
                    "the charming streets of Ile Saint-Louis",
                    "the wine bars district of Oberkampf",
                    "the elegant Rue de Grenelle",
                    "the panoramic terraces near Pompidou Center",
                    "the chic neighborhood of the 8th arrondissement",
                    "the artistic Rue Mouffetard market street",
                    "the upscale Rue Marbeuf",
                    "the trendy Batignolles neighborhood",
                    "the historic arcades of Palais Royal",
                    "the boutique hotels area of Saint-Honore",
                    "the rooftop views near Opera Garnier",
                    "the tree-lined Avenue Foch",
                    "the fashionable Place Vendome",
                    "the creative district of the 11th arrondissement",
                    "the elegant Tuileries Garden pathways",
                    "the riverside walks of Bercy",
                    "the cobblestone streets of Montmartre"
            ),
            "Tokyo", List.of(
                    "the busy crosswalks of Shibuya",
                    "the neon-lit streets of Shinjuku",
                    "the clean pavements of Ginza",
                    "the trendy boutiques of Omotesando",
                    "the traditional streets of Asakusa",
                    "the upscale avenues of Roppongi Hills",
                    "the fashion district of Daikanyama",
                    "the hipster neighborhood of Shimokitazawa",
                    "the waterfront walkways of Odaiba",
                    "the luxury shopping district of Marunouchi",
                    "the artistic streets of Nakameguro",
                    "the vintage shops of Koenji",
                    "the garden paths of Yoyogi Park",
                    "the modern architecture of Tokyo Midtown",
                    "the traditional temple grounds of Meiji Shrine",
                    "the nightlife streets of Ebisu",
                    "the bookstore district of Jimbocho",
                    "the creative hub of Yanaka",
                    "the riverside paths of Sumida",
                    "the upscale Aoyama district",
                    "the historic geisha district of Kagurazaka",
                    "the trendy cafes of Jiyugaoka",
                    "the design stores of Roppongi",
                    "the quiet residential streets of Meguro",
                    "the entertainment district of Ikebukuro",
                    "the modern towers of Shiodome",
                    "the garden oasis of Koishikawa",
                    "the shopping arcades of Nakano",
                    "the artsy Tomigaya neighborhood",
                    "the sunset views of Tokyo Tower area",
                    "the stylish streets of Azabu-Juban",
                    "the traditional market of Tsukiji outer area",
                    "the fashion-forward streets of Ura-Harajuku",
                    "the modern plaza of Shinjuku Southern Terrace",
                    "the cultural district of Ueno",
                    "the trendy izakaya streets of Yurakucho",
                    "the luxury hotel area of Toranomon",
                    "the quiet temple streets of Nezu",
                    "the panoramic Skytree area of Oshiage",
                    "the designer flagship stores of Ginza Chuo-dori",
                    "the riverside cherry blossom paths of Meguro River",
                    "the art-forward neighborhood of Nakameguro"
            ),
            "Berlin", List.of(
                    "the urban streets of Kreuzberg",
                    "the wide boulevards of Mitte",
                    "the industrial streets of Friedrichshain",
                    "the pavements near Alexanderplatz",
                    "the leafy streets of Prenzlauer Berg",
                    "the hipster cafes of Neukolln",
                    "the artistic graffiti walls of East Side Gallery",
                    "the trendy bars district of Schlesisches Tor",
                    "the elegant avenues of Charlottenburg",
                    "the vintage markets of Mauerpark",
                    "the waterfront walks along Spree River",
                    "the cultural hub of Potsdamer Platz",
                    "the bohemian streets of Wedding",
                    "the upscale neighborhood of Grunewald",
                    "the design stores of Hackescher Markt",
                    "the historic streets near Brandenburg Gate",
                    "the nightclub district of Warschauer Strasse",
                    "the garden paths of Tiergarten",
                    "the creative studios of Tempelhof",
                    "the modern architecture of Europacity",
                    "the cozy streets of Schoneberg",
                    "the food halls of Markthalle Neun",
                    "the sunset views from Teufelsberg",
                    "the boutique shopping of Kurfurstendamm",
                    "the art galleries of Auguststrasse",
                    "the canalside walks of Landwehrkanal",
                    "the historic courtyards of Heckmann Hofe",
                    "the trendy rooftops of Kreuzberg",
                    "the peaceful streets of Dahlem",
                    "the vibrant nightlife of Simon-Dach-Strasse",
                    "the modern towers of Mediaspree",
                    "the alternative scene of RAW-Gelande",
                    "the elegant Gendarmenmarkt square",
                    "the riverside path of Molecule Man area",
                    "the vintage shops of Bergmannstrasse",
                    "the tech hub streets of Berlin-Mitte",
                    "the artistic Oranienstrasse",
                    "the rooftop terraces of Soho House area",
                    "the historic Karl-Marx-Allee",
                    "the peaceful Volkspark Friedrichshain paths",
                    "the upscale boutiques of Fasanenstrasse",
                    "the creative district of Oberbaum Bridge",
                    "the boulevards of Mitte"
            ),
            "New York", List.of(
                    "the bustling sidewalks of 5th Avenue",
                    "the cobblestone streets of SoHo",
                    "the urban streets of Brooklyn",
                    "the pavements of Times Square",
                    "the streets of Greenwich Village",
                    "the trendy neighborhood of Williamsburg",
                    "the waterfront walkways of DUMBO",
                    "the luxury stores of Madison Avenue",
                    "the artistic streets of Chelsea",
                    "the hipster cafes of Bushwick",
                    "the elegant brownstones of Upper West Side",
                    "the financial district pavements of Wall Street",
                    "the High Line elevated park walkways",
                    "the rooftop terraces of Meatpacking District",
                    "the fashion boutiques of Nolita",
                    "the gritty cool streets of Lower East Side",
                    "the tree-lined streets of Park Slope Brooklyn",
                    "the modern towers of Hudson Yards",
                    "the sunset views from Brooklyn Bridge",
                    "the jazz bars area of Harlem",
                    "the designer stores of Bleecker Street",
                    "the waterfront promenade of Battery Park",
                    "the creative hub of Long Island City",
                    "the upscale Upper East Side avenues",
                    "the vintage shops of East Village",
                    "the panoramic views of Top of the Rock area",
                    "the trendy restaurants of West Village",
                    "the cultural streets near Lincoln Center",
                    "the Chinatown colorful streets",
                    "the Little Italy charming sidewalks",
                    "the modern architecture of Tribeca",
                    "the peaceful Central Park pathways",
                    "the street art district of Bushwick Collective",
                    "the waterfront of Red Hook Brooklyn",
                    "the historic brownstones of Brooklyn Heights",
                    "the nightlife streets of Lower East Side",
                    "the fashion week area of Spring Studios",
                    "the brunch spots of Tribeca",
                    "the elegant townhouses of Gramercy Park",
                    "the modern plazas of World Trade Center",
                    "the sunset promenade of Brooklyn Bridge Park",
                    "the boutique hotels area of NoMad",
                    "the stylish streets of the Meatpacking District"
            )
    );

    private final AiImageProperties aiImageProperties;
    private final ObjectMapper objectMapper;
    private RestTemplate restTemplate;

    /**
     * Build a {@link RestTemplate} with explicit connect/read timeouts so a slow
     * or hung Gemini response can't pin a Tomcat worker indefinitely (L-1).
     */
    @PostConstruct
    void initRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(60).toMillis());
        this.restTemplate = new RestTemplate(factory);
    }

    public GenerateProductImageResponse generateImage(GenerateProductImageRequest request) {
        String mode = normalizeMode(request.getMode());
        if ("background".equals(mode) && request.getBackgroundImage() == null) {
            throw new BadRequestException("Background image is required for background mode");
        }
        if (aiImageProperties.getApiKey() == null || aiImageProperties.getApiKey().isBlank()) {
            throw new IllegalStateException("AI image generation is not configured on the backend");
        }

        validateInputImage(request.getShoeImage());
        if (request.getBackgroundImage() != null) {
            validateInputImage(request.getBackgroundImage());
        }

        if ("multiple".equals(mode)) {
            List<String> prompts = buildMultiplePromptPool(
                    normalizeCity(request.getCity()),
                    normalizeTimeOfDay(request.getTimeOfDay())
            );
            List<String> selectedPrompts = pickThreePrompts(prompts);
            List<String> generatedImages = selectedPrompts.stream()
                    .map(prompt -> generateSingleImage(request.getShoeImage(), request.getBackgroundImage(), prompt))
                    .toList();

            return GenerateProductImageResponse.builder()
                    .imageDataUrl(generatedImages.get(0))
                    .imageDataUrls(generatedImages)
                    .mode(mode)
                    .build();
        }

        String prompt = buildPrompt(request, mode);
        String imageDataUrl = generateSingleImage(request.getShoeImage(), request.getBackgroundImage(), prompt);

        return GenerateProductImageResponse.builder()
                .imageDataUrl(imageDataUrl)
                .imageDataUrls(List.of(imageDataUrl))
                .mode(mode)
                .build();
    }

    /**
     * Decode the base64 payload and reject anything that isn't actually a
     * supported raster image. Prevents a prompt-injected or client-spoofed
     * SVG/HTML payload from reaching storage.
     */
    private void validateInputImage(ImageDataRequest image) {
        String raw = stripDataUrlPrefix(image.getBase64());
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(raw);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Image is not valid base64");
        }
        if (decoded.length > aiImageProperties.getMaxBytes()) {
            throw new BadRequestException("Image exceeds maximum allowed size");
        }
        String sniffed = sniffMimeType(decoded);
        if (sniffed == null) {
            throw new BadRequestException("Image content is not a supported format (png/jpeg/webp)");
        }
        if (!sniffed.equalsIgnoreCase(image.getMimeType())) {
            throw new BadRequestException(
                    "Declared MIME type does not match image contents: expected " + sniffed);
        }
    }

    private String generateSingleImage(ImageDataRequest shoeImage, ImageDataRequest backgroundImage, String prompt) {
        JsonNode payload = buildPayload(shoeImage, backgroundImage, prompt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + aiImageProperties.getModel()
                + ":generateContent?key="
                + aiImageProperties.getApiKey();

        ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                new HttpEntity<>(payload.toString(), headers),
                String.class
        );

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode parts = root.path("candidates").path(0).path("content").path("parts");
            if (!parts.isArray()) {
                throw new IllegalStateException("Gemini did not return any image parts");
            }

            String imageData = null;
            for (JsonNode part : parts) {
                String maybeData = part.path("inlineData").path("data").asText(null);
                if (maybeData != null && !maybeData.isBlank()) {
                    imageData = maybeData;
                    break;
                }
            }

            if (imageData == null) {
                throw new IllegalStateException("Gemini response did not include generated image data");
            }

            return sanitizeGeneratedImage(imageData);
        } catch (BadRequestException | IllegalStateException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse AI image generation response", ex);
        }
    }

    /**
     * Verify magic bytes on the generated base64 image. Gemini occasionally
     * returns odd payloads; reject anything that isn't a raster image before
     * storing it as a data URL on a product (C-5). Returns the full data URL
     * with the sniffed MIME type so downstream readers can't be tricked into
     * executing SVG/HTML.
     */
    private String sanitizeGeneratedImage(String base64Data) {
        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(base64Data);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("Gemini returned data that is not valid base64");
        }
        if (decoded.length > aiImageProperties.getMaxBytes()) {
            throw new IllegalStateException("Gemini returned an image larger than the allowed size");
        }
        String sniffed = sniffMimeType(decoded);
        if (sniffed == null) {
            throw new IllegalStateException("Gemini returned a non-image payload; discarding");
        }
        return "data:" + sniffed + ";base64," + base64Data;
    }

    /**
     * Magic-byte sniffer for the three formats we accept. Returns the MIME
     * type string on success, or null if the bytes don't match.
     *
     * PNG  : 89 50 4E 47 0D 0A 1A 0A
     * JPEG : FF D8 FF
     * WebP : "RIFF" .... "WEBP"
     */
    private String sniffMimeType(byte[] data) {
        if (data.length >= 8
                && (data[0] & 0xFF) == 0x89
                && (data[1] & 0xFF) == 0x50
                && (data[2] & 0xFF) == 0x4E
                && (data[3] & 0xFF) == 0x47
                && (data[4] & 0xFF) == 0x0D
                && (data[5] & 0xFF) == 0x0A
                && (data[6] & 0xFF) == 0x1A
                && (data[7] & 0xFF) == 0x0A) {
            return "image/png";
        }
        if (data.length >= 3
                && (data[0] & 0xFF) == 0xFF
                && (data[1] & 0xFF) == 0xD8
                && (data[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (data.length >= 12
                && data[0] == 'R' && data[1] == 'I' && data[2] == 'F' && data[3] == 'F'
                && data[8] == 'W' && data[9] == 'E' && data[10] == 'B' && data[11] == 'P') {
            return "image/webp";
        }
        return null;
    }

    private String stripDataUrlPrefix(String base64DataUrlOrRaw) {
        int commaIndex = base64DataUrlOrRaw.indexOf(',');
        return commaIndex >= 0 ? base64DataUrlOrRaw.substring(commaIndex + 1) : base64DataUrlOrRaw;
    }

    private JsonNode buildPayload(ImageDataRequest shoeImage, ImageDataRequest backgroundImage, String prompt) {
        List<Object> parts = new ArrayList<>();
        parts.add(inlinePart(shoeImage.getBase64(), shoeImage.getMimeType()));
        if (backgroundImage != null) {
            parts.add(inlinePart(backgroundImage.getBase64(), backgroundImage.getMimeType()));
        }
        parts.add(Map.of("text", prompt));

        return objectMapper.valueToTree(Map.of(
                "contents", Map.of("parts", parts)
        ));
    }

    private Object inlinePart(String base64DataUrlOrRaw, String mimeType) {
        return Map.of(
                "inlineData", Map.of(
                        "data", stripDataUrlPrefix(base64DataUrlOrRaw),
                        "mimeType", mimeType
                )
        );
    }

    private String buildPrompt(GenerateProductImageRequest request, String mode) {
        return switch (mode) {
            case "studio" -> buildFashionTryOnPrompt("feet-only", normalizeCity(request.getCity()), "studio");
            case "background" -> buildBackgroundPrompt(request);
            case "lifestyle" -> buildFashionTryOnPrompt("full-body", normalizeCity(request.getCity()),
                    normalizeTimeOfDay(request.getTimeOfDay()));
            default -> throw new BadRequestException("Unsupported generation mode: " + mode);
        };
    }

    private String buildFashionTryOnPrompt(String shotType, String city, String timeOfDay) {
        String perspectiveInstruction = "full-body".equals(shotType)
                ? "generate a high-quality, professional fashion photograph of a stylish FEMALE model. "
                + "The model MUST be wearing the EXACT shoes from the provided image. "
                + "The pose MUST be a STRICT 90-DEGREE SIDE PROFILE. "
                + "The model must be facing completely to the left or right. "
                + "DO NOT show the model or shoes from the front or 3/4 angle. SIDE VIEW ONLY."
                : "generate a high-quality, professional MACRO CLOSE-UP fashion photograph focusing ONLY on a stylish FEMALE model's feet and ankles from the SIDE. "
                + "The camera should be LOW ANGLE and ZOOMED IN to capture texture and detail. "
                + "The shot should correspond to 'Feet Only' mode, framing tightly around the shoes. "
                + "The shoes MUST be visible in SIDE PROFILE. DO NOT show the shoes from the front.";

        String backgroundInstruction;
        if ("studio".equals(timeOfDay)) {
            backgroundInstruction = """
                    BACKGROUND & LIGHTING:
                    - The setting is a PROFESSIONAL PHOTO STUDIO.
                    - The background MUST be PURE WHITE (#FFFFFF) or very light grey. NO props, NO scenery.
                    - Lighting should be soft, even, high-key studio lighting to highlight the product details.
                    """;
        } else {
            String randomLandmark = randomLandmark(city);
            String lightingInstruction = "night".equals(timeOfDay)
                    ? "Night time setting. Use cinematic, moody artificial street lighting (neon signs, street lamps, shop windows). The output should look like a high-end night fashion shoot."
                    : "Daytime setting. Use natural sunlight, soft shadows, or overcast daylight. The output should look like a natural street style photo.";
            backgroundInstruction = """
                    BACKGROUND & LIGHTING:
                    - The setting is explicitly A STREET/OUTDOOR SETTING in %s, specifically: %s.
                    - %s
                    - The model MUST be standing or walking on the street. NO sitting, NO climbing on objects.
                    - DO NOT use generic postcards views. Use a grounded, street-level perspective.
                    """.formatted(city, randomLandmark, lightingInstruction);
        }

        return """
                I am providing an image of a pair of shoes.

                TASK:
                - Please %s
                - The image must differ from typical AI-generated glossy looks. It should look like a RAW photograph taken with a professional DSLR camera (e.g., Leica or Canon 5D).
                - Add subtle imperfections like film grain, slight motion blur, or natural lens diffraction to ensure PHOTOREALISM.

                %s

                - CRITICAL: The angle MUST be from the SIDE to showcase the silhouette of the shoes. NEVER from the front.
                - CRITICAL: STRICTLY SIDE PROFILE. NO FRONT VIEW. NO 3/4 VIEW.
                - CRITICAL: The model MUST NOT wear socks under any circumstances. Bare ankles only. NO SOCKS VISIBLE EVER.
                - CRITICAL: THE SHOES ARE THE STAR. The pose must make the shoes the clear focal point. Shoes must be fully visible, never hidden or cut off.
                - CRITICAL: NO SHADOWS on the ground or background.
                """.formatted(perspectiveInstruction, backgroundInstruction);
    }

    private String buildBackgroundPrompt(GenerateProductImageRequest request) {
        String focusArea = normalizeFocusArea(request.getFocusArea());
        String framingInstruction = "full-body".equals(focusArea)
                ? "**FRAMING:** Generate a realistic human model (full body or 3/4 view depending on the scene's perspective)."
                : "**FRAMING:** EXTREME CLOSE-UP. The image MUST show the model ONLY FROM THE WAIST DOWN to the feet. Focus specifically on the shoes and ankles. The shoes should fill a significant portion of the frame for a MACRO look. DO NOT include the head or upper torso. Crop tight on the lower body.";

        return """
                You are a professional fashion photographer globally renowned for your compositions.

                TASK:
                Create a highly realistic fashion image of a model wearing the SHOES provided in the first image, placing them naturally into the SCENE provided in the second image.

                INPUTS:
                1.  **Image 1 (SHOES):** The product to be featured.
                2.  **Image 2 (BACKGROUND):** The exact location/background where the shoot takes place.

                INSTRUCTIONS:
                - %s
                - **Clothing:** Dress the model in stylish, neutral, or complimentary fashion that suits the vibe of the background scene.
                - **Shoes:** The model MUST be wearing the exact shoes from Image 1. THE SHOES MUST BE THE HERO OF THE IMAGE - prominently visible and the focal point.
                - **Integration:** The model must be interacting with the environment in Image 2 naturally.
                - **Lighting/Tone:** Match the lighting, shadows, and color grading of the generated model perfectly to the provided background image.
                - **Photorealism:** The final result must look like a real photograph, not a collage or Photoshop job.
                - **CRITICAL - NO SOCKS:** The model MUST NOT wear socks under any circumstances. Bare ankles only. NO SOCKS VISIBLE EVER.
                - **CRITICAL - SHOE FOCUS:** The pose must showcase the shoes clearly. Shoes should never be hidden, obscured, or cut off.

                OUTPUT:
                - Return ONLY the generated image.
                """.formatted(framingInstruction);
    }

    private List<String> buildMultiplePromptPool(String city, String timeOfDay) {
        String backgroundPrompt;
        if ("studio".equals(timeOfDay)) {
            backgroundPrompt = "BACKGROUND: PURE WHITE STUDIO BACKGROUND. High-key professional lighting. No distractions.";
        } else {
            String randomLandmark = randomLandmark(city);
            String lightingInstruction = "night".equals(timeOfDay)
                    ? "Night time setting. Use cinematic, moody artificial street lighting. High-end night fashion shoot."
                    : "Daytime setting. Use natural sunlight. Natural street style photo.";
            backgroundPrompt = "BACKGROUND: Street/Outdoor setting in " + city
                    + ", specifically: " + randomLandmark + ". " + lightingInstruction;
        }

        return List.of(
                buildMultipleScenarioPrompt(backgroundPrompt, """
                        TASK: Generate an EXTREME CLOSE-UP side view focusing ONLY on the SHOES and ANKLES of a stylish FEMALE model.
                        COMPOSITION: Cropped very tight - show only from mid-calf down. The shoes should fill most of the frame.
                        Instagram-ready detail shot showcasing shoe design. NO UPPER BODY.
                        """),
                buildMultipleScenarioPrompt(backgroundPrompt, """
                        TASK: Generate a FULL BODY SIDE PROFILE of a stylish FEMALE model from waist down.
                        COMPOSITION: Show complete legs from waist to feet. Model standing in an elegant, confident pose.
                        Perfect for Instagram fashion grid posts. The silhouette should be striking. NO UPPER BODY.
                        """),
                buildMultipleScenarioPrompt(backgroundPrompt, """
                        TASK: Generate a side view of a stylish FEMALE model's LEGS MID-STRIDE.
                        COMPOSITION: Capture the model walking - one leg forward, one back. Dynamic motion blur effect optional.
                        Instagram story or reel thumbnail style - energetic and fashionable. NO UPPER BODY.
                        """),
                buildMultipleScenarioPrompt(backgroundPrompt, """
                        TASK: Generate a close-up side view of a stylish FEMALE model's LEGS SITTING elegantly.
                        COMPOSITION: Legs crossed at ankles or knees. Relaxed, sophisticated pose on a chair (studio) or step (street).
                        Instagram lifestyle aesthetic. The focus is on the shoes as the statement piece. NO UPPER BODY.
                        """),
                buildMultipleScenarioPrompt(backgroundPrompt, """
                        TASK: Generate a side view of a stylish FEMALE model's LEGS with the model standing on TIP-TOE or one leg slightly lifted.
                        COMPOSITION: Elegant, ballet-inspired pose showing the arch of the foot. Showcases the shoe from a flattering angle.
                        Perfect for Instagram carousel posts. NO UPPER BODY.
                        """),
                buildMultipleScenarioPrompt(backgroundPrompt, """
                        TASK: Generate a side view of a stylish FEMALE model's LEGS in a CASUAL LEANING pose.
                        COMPOSITION: Model leaning against a wall or railing (if street) or standing with weight on one hip.
                        Relaxed, effortless street style vibe for Instagram. NO UPPER BODY.
                        """)
        );
    }

    private String buildMultipleScenarioPrompt(String backgroundPrompt, String poseInstruction) {
        return """
                I am providing an image of a pair of shoes.
                The image must look like a RAW photograph taken with a professional DSLR camera. Photorealistic.
                %s

                CRITICAL FRAMING INSTRUCTION:
                - THE IMAGE MUST BE CROPPED FROM THE WAIST DOWN.
                - FOCUS ONLY ON THE LEGS AND FEET.
                - DO NOT SHOW THE HEAD, SHOULDERS, OR UPPER TORSO.
                - IF YOU GENERATE A FULL BODY MODEL, YOU HAVE FAILED.

                CRITICAL: The angle MUST be from the SIDE. NEVER from the front.
                CRITICAL: The model MUST NOT wear socks under any circumstances. Bare ankles only. NO SOCKS VISIBLE EVER.
                CRITICAL: NO SHADOWS. The image must have NO visible shadows on the ground or background.
                CRITICAL: THE SHOES ARE THE STAR OF THE IMAGE. Every pose must showcase the shoes prominently. Shoes must be fully visible, never hidden, obscured, or cut off from the frame.
                %s
                """.formatted(backgroundPrompt, poseInstruction);
    }

    private String normalizeMode(String mode) {
        if (mode == null) {
            return "studio";
        }
        return mode.trim().toLowerCase();
    }

    private String normalizeCity(String city) {
        if (city == null || city.isBlank()) {
            return "Istanbul";
        }
        return CITY_LANDMARKS.keySet().stream()
                .filter(candidate -> candidate.equalsIgnoreCase(city.trim()))
                .findFirst()
                .orElse("Istanbul");
    }

    private String normalizeTimeOfDay(String timeOfDay) {
        if (timeOfDay == null) {
            return "day";
        }
        String normalized = timeOfDay.trim().toLowerCase();
        return switch (normalized) {
            case "day", "night" -> normalized;
            default -> "day";
        };
    }

    private String normalizeFocusArea(String focusArea) {
        if (focusArea == null) {
            return "waist-down";
        }
        return "full-body".equalsIgnoreCase(focusArea.trim()) ? "full-body" : "waist-down";
    }

    private String randomLandmark(String city) {
        List<String> landmarks = CITY_LANDMARKS.getOrDefault(city, CITY_LANDMARKS.get("Istanbul"));
        return landmarks.get(ThreadLocalRandom.current().nextInt(landmarks.size()));
    }

    private List<String> pickThreePrompts(List<String> promptPool) {
        List<String> shuffled = new ArrayList<>(promptPool);
        java.util.Collections.shuffle(shuffled);
        return shuffled.subList(0, Math.min(3, shuffled.size()));
    }
}
