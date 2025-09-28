import { redis } from "../config/redis.config.js"
import cloudinary from "../config/cloudinary.config.js"
import Product from "../model/product.model.js"
import { addAzureParams } from "./../node_modules/mongodb/src/client-side-encryption/providers/azure"

// all products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}) //find all products
    res.status(200).json({
      products,
    })
  } catch (error) {
    console.log("Error in get all products controller", error.message)
    res.status(500).json({ message: error.message })
  }
}

// featured Products
export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_products") // get featured products from redis

    if (featuredProducts) {
      return res.status(200).json(JSON.parser(featuredProducts))
      return res.status(200).json(JSON.parse(featuredProducts))
    }

    // if not in redis , fetch from mongodb
    // .lean() is gonna return a plain js obj instad of mongodb document

    featuredProducts = await Product.find({ isfeatured: true }).lean()

    if (!featuredProducts) {
      return res.status(404).json({ message: "No featured products found" })
    }

    // store in redis for future quick access
    await redis.set("featured_products", JSON.stringify(featuredProducts))

    res.status(200).json({
      featuredProducts,
    })
  } catch (error) {
    console.log("Error in get featured products controller", error.message)
    res.status(500).json({
      message: error.message,
    })
  }
}

// Recommended Products
export const getRecommendedProducts = async (req, res) => {
  try {
    const product = await Product.aggregate([
      {
        $sample: { size: 4 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          price: 1,
          description: 1,
        },
      },
    ])

    res.status(200).json({ product })
  } catch (error) {
    console.log("Error in get recommended products controller ", error.message)
    res.status(500).json({
      message: error.message,
    })
  }
}

// create product
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body

    let cloudinaryResponse = null

    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      })
    }

    const product = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.secure_url
        ? cloudinaryResponse?.secure_url
        : " ",
      category,
    })

    res.status(200).json(product)
  } catch (error) {
    console.log("Error in create product controller", error.message)
    res.status(500).json({
      message: error.message,
    })
  }
}

// Product by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params

    const products = await Product.find({ category })

    res.status(200).json({
      products,
    })
  } catch (error) {
    console.log("Error in get products by category controller", error.message)
    res.status(500).json({
      message: error.message,
    })
  }
}

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (product) {
      product.isFeatured = !product.isFeatured
      const updateProduct = await product.save()
      const updatedProduct = await product.save()
      await updateFeaturedProductCache()

      res.status(updateFeaturedProduct)
      res.status(200).json(updatedProduct)
    } else {
      res.status(404).json({ message: "Product not found" })
    }
  } catch (error) {}
  } catch (error) {
    console.log("Error in toggle featured product controller", error.message)
    res.status(500).json({ message: error.message })
  }
}

// delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      })
    }

    if (product.image) {
      const productId = product.image.split("/").pop().split(".")[0]
      const publicId = product.image.split("/").pop().split(".")[0]
      try {
        await cloudinary.uploader.destroy(`/products/${publicId}`)
        await cloudinary.uploader.destroy(`products/${publicId}`)
        console.log("Image deleted from cloudinary")
      } catch (error) {
        console.log("Error in deleting image from cloudinary", error.message)
      }
    }

    await Product.findByIdAndDelete(req.params.id)

    res.status(200).json({
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.log("Error in delete product controller", error.message)
    res.status(500).json({
      message: error.message,
    })
  }
}

//update featured Product cache
const updateFeaturedProductCache = async () => {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean()
    await redis.set("featured_products", JSON.stringify(featuredProducts))
  } catch (error) {
    console.log("Error in update featured producst cache", error.message)
  }
}
