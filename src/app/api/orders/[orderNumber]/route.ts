import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { centsToEuro } from "@/lib/utils/currency";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        giftCards: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Non esporre dati sensibili - filtra solo quelli necessari
    // Convert cents to euro for monetary fields
    const sanitizedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      email: order.email,
      total: centsToEuro(order.total),
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.Product?.name || "Unknown Product",
        quantity: item.quantity,
        size: item.size,
        unitPrice: centsToEuro(item.unitPrice),
        totalPrice: centsToEuro(item.totalPrice),
      })),
      giftCards: order.giftCards.map((gc) => ({
        id: gc.id,
        code: gc.code,
        initialValue: centsToEuro(gc.initialValue),
        isActive: gc.isActive,
        expiresAt: gc.expiresAt,
      })),
    };

    return NextResponse.json(sanitizedOrder);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
