package com.web.chatbot.service;

import com.web.chatbot.entity.ChatMessage;
import com.web.chatbot.repository.ChatMessageRepository;
import com.google.cloud.bigquery.*;
import com.google.cloud.dialogflow.v2.*;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Date;
import java.util.Map;

@Service
public class ChatbotService {

    @Value("${dialogflow.projectId}")
    private String projectId;

    @Value("${delhivery.api.token}")
    private String delhiveryApiToken;

    @Autowired
    private ChatMessageRepository repository;

    private final BigQuery bigQuery = BigQueryOptions.getDefaultInstance().getService();

    // Main handler for structured chatbot flows
    public String handleStructuredFlow(String sessionId, String message) {
        if (message.equalsIgnoreCase("Track Order")) {
            return saveAndRespond("bot", "Please enter your tracking number.");
        } else if (message.startsWith("Track Order:")) {
            String trackingNumber = message.split(":")[1].trim();
            String status = fetchDelhiveryTrackingStatus(trackingNumber);
            return saveAndRespond("bot", status);
        } else if (message.equalsIgnoreCase("Place Order")) {
            return saveAndRespond("bot", "To place an order, visit: https://www.delhivery.com/booking");
        } else if (message.equalsIgnoreCase("Agent")) {
            return saveAndRespond("bot", "Connecting you with a live agent...");
        } else {
            // Fallback to NLP via Dialogflow
            try {
                String response = detectIntent(sessionId, message);
                return saveAndRespond("bot", response);
            } catch (Exception e) {
                e.printStackTrace();
                return saveAndRespond("bot", "I'm having trouble understanding you. Could you rephrase?");
            }
        }
    }

    // Dialogflow webhook handler
    public Map<String, Object> handleWebhookRequest(Map<String, Object> request) {
        Map<String, Object> queryResult = (Map<String, Object>) request.get("queryResult");
        String intentName = ((Map<String, Object>) queryResult.get("intent")).get("displayName").toString();

        if ("TrackOrder".equals(intentName)) {
            Map<String, Object> parameters = (Map<String, Object>) queryResult.get("parameters");
            String trackingNumber = parameters.get("tracking_number").toString();
            String status = fetchDelhiveryTrackingStatus(trackingNumber);
            return Map.of("fulfillmentText", status);
        }

        return Map.of("fulfillmentText", "Sorry, I couldn't handle that request.");
    }

    // Fetches order status from Delhivery API
    private String fetchDelhiveryTrackingStatus(String trackingNumber) {
        RestTemplate restTemplate = new RestTemplate();
        String url = "https://api.delhivery.com/v1/packages/json/?waybill=" + trackingNumber + "&token="
                + delhiveryApiToken;

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            JSONObject json = new JSONObject(response.getBody());
            JSONArray shipmentData = json.getJSONArray("ShipmentData");
            JSONObject shipment = shipmentData.getJSONObject(0);
            JSONObject shipmentDetails = shipment.getJSONObject("Shipment").getJSONObject("Status");
            String status = shipmentDetails.getString("Status");

            return "Current status for package " + trackingNumber + ": " + status;
        } catch (Exception e) {
            return "Unable to retrieve tracking details. Please check the tracking number.";
        }
    }

    // Dialogflow intent detection method
    public String detectIntent(String sessionId, String text) throws IOException {
        SessionsSettings settings = SessionsSettings.newBuilder().build();
        try (SessionsClient sessionsClient = SessionsClient.create(settings)) {
            SessionName session = SessionName.of(projectId, sessionId);
            TextInput.Builder textInput = TextInput.newBuilder().setText(text).setLanguageCode("en-US");
            QueryInput queryInput = QueryInput.newBuilder().setText(textInput).build();

            DetectIntentResponse response = sessionsClient.detectIntent(session, queryInput);
            return response.getQueryResult().getFulfillmentText();
        }
    }

    // Save message to MongoDB and BigQuery, then return response
    private String saveAndRespond(String sender, String message) {
        ChatMessage chatMessage = new ChatMessage();
        chatMessage.setSender(sender);
        chatMessage.setMessage(message);
        chatMessage.setTimestamp(new Date());

        repository.save(chatMessage);
        // insertIntoBigQuery(chatMessage);

        return message;
    }

    // Inserts logs into BigQuery for analytics
    private void insertIntoBigQuery(ChatMessage message) {
        TableId tableId = TableId.of("chatbot_dataset", "messages");

        InsertAllRequest insertRequest = InsertAllRequest.newBuilder(tableId)
                .addRow(Map.of(
                        "sender", message.getSender(),
                        "message", message.getMessage(),
                        "timestamp", message.getTimestamp().toString()))
                .build();

        bigQuery.insertAll(insertRequest);
    }
}
