import { groupSrvRecords } from "ioredis/built/cluster/util.js"
import Order from "../model/order.model.js"
import Product from "../model/product.model.js"
import User from "../model/user.model.js"

export const getAnalyticsData = async () => {
  // 1. total users
  // 2. total products
  // 3. salesData
  // 4. {totalSales, totalRevenue} = salesData[0]
  // return everything

  const totalUsers = await User.countDocuments()
  const totalProducts = await Product.countDocuments()

  const salesData = await Order.aggregate({
    $group: {
      _id: null,
      totalSales: { $sum: 1 },
      totalRevenue: { $sum: "$totalAmount" },
    },
  })

  const { totalSales, totalRevenue } = salesData[0] || {
    totalSales,
    totalRevenue,
  }

  return {
    users: totalUsers,
    products: totalProducts,
    totalSales,
    totalRevenue,
  }
}

export const getDailySalesData = async (startDate, endDate) => {
  try {
    // 1. dailySalesData
    //   *  $match    {  createdAt {     $gte,    $lte  }    }
    //   *  $group      {    _id , $ dateToString     {   format , date}
    //                          sales: {$sum:1}
    //                         revenue: {$sum: "$totalAmount"}   }

    //   *  $sort          {   _id : 1   }

    // 2. dateArray        {   getDatesInRange   -   startData, endDate     }
    // return everything

    const dailySalesData = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: 1 },
          revenue: { $sum: "totalAmount" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])

    // example of dailySalesData
    //  [
    //     {
    //         _id: "2025-10-03",
    //         sales: 15,
    //         revenue: 1478.21
    //     }
    //  ]

    const dateArray = getDatesInRange(startDate, endDate)
    //console.log(dateArray)   // ['2025-10-03' , ' 2024-10-04' , ... ]

    return dateArray.map((date) => {
      const foundData = dailySalesData.find((item) => {
        item._id === date
      })

      return {
        date,
        sales: foundData?.sales || 0,
        revenue: foundData?.revenue || 0,
      }
    })
  } catch (error) {
    throw error
  }
}

// logic behind the getDatesInRange

function getDatesInRange(startDate, endDate) {
  const dates = []
  let currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().split("T")[0])
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}
