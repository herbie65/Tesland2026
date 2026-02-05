/**
 * API Route: Get Product by Slug
 * 
 * Returns complete product information including:
 * - Basic product data
 * - Images (with local paths)
 * - Inventory
 * - Categories
 * - Custom options (e.g., Inbouwkosten)
 * - Variants (for configurable products)
 * 
 * Usage: GET /api/catalog/products/[slug]
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

    // Fetch product with all relations
    const product = await prisma.productCatalog.findUnique({
      where: { slug },
      include: {
        // Images
        images: {
          orderBy: [
            { isMain: 'desc' },
            { position: 'asc' },
          ],
        },
        // Inventory
        inventory: true,
        // Categories
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                path: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        // Custom Options (Inbouwkosten, etc.)
        customOptions: {
          include: {
            values: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        // Attribute Values (color, size, etc.)
        attributeValues: {
          include: {
            attribute: true,
            option: true,
          },
        },
        // Variants for configurable products (parent -> children)
        parentRelations: {
          include: {
            child: {
              include: {
                inventory: true,
                images: {
                  where: { isMain: true },
                  take: 1,
                },
              },
            },
          },
        },
        // Parent product (if this is a variant / simple child)
        childRelations: {
          include: {
            parent: {
              select: {
                id: true,
                sku: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const response = {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: buildProductDescription({
        description: product.description,
        shortDescription: product.shortDescription,
      }),
      shortDescription: product.shortDescription ? htmlToPlainText(product.shortDescription) : null,
      
      // Pricing
      price: product.price,
      costPrice: product.costPrice,
      specialPrice: product.specialPrice,
      specialPriceFrom: product.specialPriceFrom,
      specialPriceTo: product.specialPriceTo,
      
      // Has special price active?
      hasActiveSpecialPrice: product.specialPrice && 
        (!product.specialPriceFrom || new Date(product.specialPriceFrom) <= new Date()) &&
        (!product.specialPriceTo || new Date(product.specialPriceTo) >= new Date()),
      
      // Display price
      displayPrice: product.specialPrice && 
        (!product.specialPriceFrom || new Date(product.specialPriceFrom) <= new Date()) &&
        (!product.specialPriceTo || new Date(product.specialPriceTo) >= new Date())
          ? product.specialPrice
          : product.price,
      
      // Product Info
      type: product.typeId,
      weight: product.weight,
      status: product.status,
      visibility: product.visibility,
      
      // SEO
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      metaKeywords: product.metaKeywords,
      
      // Images
      images: product.images.map(img => ({
        id: img.id,
        url: img.localPath || img.url, // Prefer local path
        label: img.label,
        position: img.position,
        isMain: img.isMain,
        isThumbnail: img.isThumbnail,
      })),
      
      // Main image
      mainImage: product.images.find(img => img.isMain)?.localPath || 
                 product.images.find(img => img.isMain)?.url ||
                 product.images[0]?.localPath ||
                 product.images[0]?.url,
      
      // Inventory
      inventory: product.inventory ? {
        qty: product.inventory.qty,
        qtyReserved: product.inventory.qtyReserved,
        qtyAvailable: Math.max(0, Number(product.inventory.qty || 0) - Number(product.inventory.qtyReserved || 0)),
        isInStock: product.inventory.manageStock === false
          ? true
          : (Math.max(0, Number(product.inventory.qty || 0) - Number(product.inventory.qtyReserved || 0)) > 0 && product.inventory.isInStock),
        backorders: product.inventory.backorders,
        manageStock: product.inventory.manageStock,
      } : null,
      
      // Categories
      categories: product.categories.map(pc => ({
        id: pc.category.id,
        name: pc.category.name,
        slug: pc.category.slug,
        path: pc.category.path,
      })),
      
      // Custom Options (Inbouwkosten)
      customOptions: product.customOptions.map(opt => ({
        id: opt.id,
        title: opt.title,
        type: opt.type,
        isRequired: opt.isRequire,
        price: opt.price,
        priceType: opt.priceType,
        sku: opt.sku,
        values: opt.values.map(val => ({
          id: val.id,
          title: val.title,
          price: val.price,
          priceType: val.priceType,
          sku: val.sku,
        })),
      })),
      
      // Attributes (for filters and display)
      attributes: product.attributeValues.reduce((acc, av) => {
        acc[av.attribute.attributeCode] = {
          label: av.attribute.attributeLabel,
          value: av.option?.optionLabel || av.value,
          code: av.attribute.attributeCode,
        };
        return acc;
      }, {} as Record<string, { label: string; value: string | null; code: string }>),
      
      // Variants (for configurable products)
      variants: product.typeId === 'configurable' 
        ? product.parentRelations.map(rel => ({
            id: rel.child.id,
            sku: rel.child.sku,
            name: rel.child.name,
            slug: rel.child.slug,
            price: rel.child.price,
            specialPrice: rel.child.specialPrice,
            displayPrice: rel.child.specialPrice || rel.child.price,
            inventory: rel.child.inventory ? {
              qty: rel.child.inventory.qty,
              qtyReserved: rel.child.inventory.qtyReserved,
              qtyAvailable: Math.max(0, Number(rel.child.inventory.qty || 0) - Number(rel.child.inventory.qtyReserved || 0)),
              isInStock: rel.child.inventory.manageStock === false
                ? true
                : (Math.max(0, Number(rel.child.inventory.qty || 0) - Number(rel.child.inventory.qtyReserved || 0)) > 0 && rel.child.inventory.isInStock),
              manageStock: rel.child.inventory.manageStock,
            } : null,
            image: rel.child.images[0]?.localPath || rel.child.images[0]?.url,
          }))
        : [],
      
      // Parent product (if variant)
      parentProduct: product.childRelations[0]?.parent || null,
      
      // Timestamps
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
