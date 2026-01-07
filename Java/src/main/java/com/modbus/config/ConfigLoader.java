package com.modbus.config;

import java.io.FileReader;
import java.io.FileNotFoundException;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;

public class ConfigLoader {
    
    public static boolean exists(String filename) {
        java.io.File file = new java.io.File(filename);
        return file.exists();
    }
    
    public static AppConfig load(String filename) {
        AppConfig config = new AppConfig();
        
        try {
            Gson gson = new Gson();
            FileReader reader = new FileReader(filename);
            
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> data = gson.fromJson(reader, java.util.Map.class);
            
            reader.close();
            
            if (data == null) {
                System.out.println("配置文件解析失败，使用默认配置");
                return config.loadDefault();
            }
            
            config.parseFromMap(data);
            System.out.println("配置文件 " + filename + " 加载成功");
            
        } catch (FileNotFoundException e) {
            System.out.println("配置文件 " + filename + " 不存在，使用默认配置");
            config.loadDefault();
        } catch (JsonSyntaxException e) {
            System.out.println("配置文件格式错误: " + e.getMessage());
            System.out.println("使用默认配置");
            config.loadDefault();
        } catch (Exception e) {
            System.out.println("加载配置文件时发生错误: " + e.getMessage());
            System.out.println("使用默认配置");
            config.loadDefault();
        }
        
        return config;
    }
    
    public static AppConfig loadDefault() {
        return new AppConfig().loadDefault();
    }
}
