/**
 * API Route: Get Category with Products
 * 
 * Returns category information with all products in that category
 * 
 * Usage: GET /api/catalog/categories/[slug]
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildProductDescription, htmlToPlainText } from '@/lib/product-description';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    // Fetch category
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
          where: {
            isActive: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Get total count
    const totalCount = await prisma.productCatalog.count({
      where: {
        status: 'enabled',
        categories: {
          some: {
            categoryId: category.id,
          },
        },
      },
    });

    // Fetch products in this category
    const products = await prisma.productCatalog.findMany({
      where: {
        status: 'enabled',
        categories: {
          some: {
            categoryId: category.id,
          },
        },
      },
      include: {
        images: {
          where: { isMain: true },
          take: 1,
        },
        inventory: {
          select: {
            qty: true,
            qtyReserved: true,
            isInStock: true,
            manageStock: true,
          },
        },
      },
      orderBy: [
        {
          categories: {
            _count: 'desc', // Products with more categories first
          },
        },
        {
          name: 'asc',
        },
      ],
      skip,
      take: pageSize,
    });

    // Transform products
    const transformedProducts = products.map(product => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: buildProductDescription({
        description: product.description,
        shortDescription: product.shortDescription,
      }),
      shortDescription: product.shortDescription ? htmlToPlainText(product.shortDescription) : null,
      price: product.price,
      specialPrice: product.specialPrice,
      hasActiveSpecialPrice: product.specialPrice && 
        (!product.specialPriceFrom || new Date(product.specialPriceFrom) <= new Date()) &&
        (!product.specialPriceTo || new Date(product.specialPriceTo) >= new Date()),
      displayPrice: product.specialPrice && 
        (!product.specialPriceFrom || new Date(product.specialPriceFrom) <= new Date()) &&
        (!product.specialPriceTo || new Date(product.specialPriceTo) >= new Date())
          ? product.specialPrice
          : product.price,
      image: product.images[0]?.localPath || product.images[0]?.url || null,
      inventory: product.inventory ? (() => {
        const qty = Number(product.inventory.qty || 0)
        const reserved = Number(product.inventory.qtyReserved || 0)
        const available = Math.max(0, qty - reserved)
        return {
          qty: product.inventory.qty,
          qtyReserved: product.inventory.qtyReserved,
          qtyAvailable: available,
          isInStock: product.inventory.manageStock === false ? true : (available > 0 && product.inventory.isInStock),
          manageStock: product.inventory.manageStock,
        }
      })() : null,
    }));

    const response = {
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        level: category.level,
        path: category.path,
        parent: category.parent,
        children: category.children,
      },
      products: transformedProducts,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNext: page < Math.ceil(totalCount / pageSize),
        hasPrev: page > 1,
      },
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
