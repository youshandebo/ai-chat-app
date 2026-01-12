import express from "express";
import { ProductService } from "../services/productService";
import { OrderService } from "../services/orderService";
import { requireAdmin } from "../middleware/auth";
import crypto from "crypto";

const router = express.Router();

// ==================== 公开接口 ====================

// 获取已启用商品列表
router.get("/products", (req, res) => {
    try {
        const products = ProductService.getAll(false); // 只获取已启用的
        res.json(products);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== 管理接口 ====================

// 获取全部商品（包括禁用的）
router.get("/admin/products", requireAdmin, (req, res) => {
    try {
        const products = ProductService.getAll(true);
        res.json(products);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 创建商品
router.post("/admin/products", requireAdmin, (req, res) => {
    try {
        const { name, description, price, image, afdianLink, enabled } = req.body;

        if (!name || !price) {
            return res.status(400).json({ error: "商品名称和价格为必填项" });
        }
        if (name.length > 100) {
            return res.status(400).json({ error: "商品名称过长（最多100字符）" });
        }
        if (description && description.length > 2000) {
            return res.status(400).json({ error: "商品描述过长（最多2000字符）" });
        }

        const product = ProductService.create({
            name,
            description: description || "",
            price,
            image: image || "",
            afdianLink: afdianLink || "",
            enabled: enabled !== false
        });
        res.json(product);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 更新商品
router.put("/admin/products/:id", requireAdmin, (req, res) => {
    try {
        const updated = ProductService.update(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: "商品不存在" });
        }
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 删除商品
router.delete("/admin/products/:id", requireAdmin, (req, res) => {
    try {
        const success = ProductService.delete(req.params.id);
        if (!success) {
            return res.status(404).json({ error: "商品不存在" });
        }
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 获取订单列表（管理员）
router.get("/admin/orders", requireAdmin, (req, res) => {
    try {
        const orders = OrderService.getAll();
        res.json(orders);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== 爱发电 Webhook ====================

// 接收爱发电订单回调
router.post("/afdian/webhook", (req, res) => {
    try {
        const { ec, data, sign } = req.body;
        const token = process.env.AFDIAN_WEBHOOK_TOKEN;

        // 签名校验
        if (token) {
            const mySign = crypto.createHash('md5').update(token + JSON.stringify(data)).digest('hex');
            if (mySign !== sign) {
                console.warn("[Afdian Webhook] Invalid signature");
                return res.json({ ec: 200, em: "invalid signature" });
            }
        }

        console.log("[Afdian Webhook] Received callback (data masked)");

        if (ec !== 200 || !data) {
            console.warn("[Afdian Webhook] Invalid request status or missing data");
            return res.json({ ec: 200, em: "invalid data" });
        }

        if (data.type === "order" && data.order) {
            const order = data.order;

            // 创建或更新订单（幂等）
            const savedOrder = OrderService.create({
                outTradeNo: order.out_trade_no,
                userId: order.user_id,
                planId: order.plan_id,
                amount: order.total_amount,
                showAmount: order.show_amount,
                status: order.status,
                remark: order.remark || "",
                skuDetail: order.sku_detail || []
            });

            console.log("[Afdian Webhook] Order saved:", savedOrder.outTradeNo);
        }

        // 返回成功响应
        res.json({ ec: 200, em: "" });
    } catch (e: any) {
        console.error("[Afdian Webhook] Error:", e);
        // 即使出错也返回200，避免爱发电重试
        res.json({ ec: 200, em: e.message });
    }
});

export default router;
