import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { writeJsonAtomic } from "../utils/fileUtils";

const dataPath = path.resolve(process.cwd(), "data/orders.json");

export interface Order {
    id: string;
    outTradeNo: string; // 爱发电订单号
    userId: string; // 爱发电用户ID
    planId?: string; // 爱发电计划ID
    amount: string; // 支付金额
    showAmount: string; // 显示金额
    status: number; // 订单状态 (2 = 已支付)
    remark: string;
    skuDetail: any[];
    createdAt: number;
}

let orders: Order[] = [];

function ensureLoaded() {
    if (fs.existsSync(dataPath)) {
        try {
            const raw = fs.readFileSync(dataPath, "utf-8");
            orders = JSON.parse(raw);
        } catch (e) {
            console.error("Failed to parse orders.json", e);
            orders = [];
        }
    } else {
        orders = [];
    }
}

function persist() {
    try {
        writeJsonAtomic(dataPath, orders);
    } catch (e) {
        console.error("Failed to persist orders", e);
    }
}

ensureLoaded();

export function getOrders(): Order[] {
    ensureLoaded();
    return orders.sort((a, b) => b.createdAt - a.createdAt);
}

export function getOrderByOutTradeNo(outTradeNo: string): Order | null {
    ensureLoaded();
    return orders.find(o => o.outTradeNo === outTradeNo) || null;
}

export function createOrder(data: Omit<Order, "id" | "createdAt">): Order {
    ensureLoaded();

    // 幂等处理：如果订单已存在，直接返回
    const existing = orders.find(o => o.outTradeNo === data.outTradeNo);
    if (existing) {
        return existing;
    }

    const order: Order = {
        id: randomUUID(),
        ...data,
        createdAt: Date.now(),
    };
    orders.unshift(order);
    persist();
    return order;
}

export function updateOrderStatus(outTradeNo: string, status: number): Order | null {
    ensureLoaded();
    const index = orders.findIndex(o => o.outTradeNo === outTradeNo);
    if (index === -1) return null;

    orders[index] = { ...orders[index], status };
    persist();
    return orders[index];
}

export const OrderService = {
    getAll: getOrders,
    getByOutTradeNo: getOrderByOutTradeNo,
    create: createOrder,
    updateStatus: updateOrderStatus
};
