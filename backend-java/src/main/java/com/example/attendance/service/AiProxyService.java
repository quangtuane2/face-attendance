package com.example.attendance.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.Map;

@Service
public class AiProxyService {
    private static final Logger log = LoggerFactory.getLogger(AiProxyService.class);

    private final WebClient webClient;

    public AiProxyService(@Value("${ai.service.url}") String aiServiceUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(aiServiceUrl)
                .build();
    }

    /**
     * Gửi ảnh đến Python AI để đăng ký khuôn mặt
     */
    public Map<String, Object> enrollFace(String employeeId, byte[] imageBytes, String filename) {
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("image", new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() { return filename; }
            }).contentType(MediaType.IMAGE_JPEG);

            return webClient.post()
                    .uri("/enroll/{employeeId}", employeeId)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("Error calling AI enroll service: {}", e.getMessage());
            return Map.of("success", false, "message", "AI service không khả dụng: " + e.getMessage());
        }
    }

    /**
     * Gửi ảnh frame đến Python AI để nhận diện khuôn mặt
     */
    public Map<String, Object> recognizeFace(byte[] imageBytes, String filename) {
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("image", new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() { return filename; }
            }).contentType(MediaType.IMAGE_JPEG);

            return webClient.post()
                    .uri("/recognize")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("Error calling AI recognize service: {}", e.getMessage());
            return Map.of("recognized", false, "employee_id", null,
                          "confidence", 0.0, "message", "AI service không khả dụng");
        }
    }

    /**
     * Xóa embedding khuôn mặt của nhân viên
     */
    public Map<String, Object> deleteFace(String employeeId) {
        try {
            return webClient.delete()
                    .uri("/enroll/{employeeId}", employeeId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception e) {
            log.error("Error calling AI delete service: {}", e.getMessage());
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    /**
     * Kiểm tra Python AI service còn sống không
     */
    public boolean isAiServiceHealthy() {
        try {
            Map result = webClient.get()
                    .uri("/health")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            return result != null && "ok".equals(result.get("status"));
        } catch (Exception e) {
            return false;
        }
    }
}
