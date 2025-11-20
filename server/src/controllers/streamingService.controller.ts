import { Request, Response } from 'express';
import { Types } from 'mongoose';
import StreamingService from '../models/StreamingService';
import UserStreamingService from '../models/UserStreamingService';
import User, { Service } from '../models/user';
import { AuthedRequest } from '../middleware/auth';

const PROVIDER_TO_CANONICAL: Record<number, Service> = {
  8: 'netflix',
  15: 'hulu',
  384: 'max',
  9: 'prime',
  337: 'disney',
  387: 'peacock',
};

class StreamingServiceController {
  // GET /api/streaming-services - Get all available streaming services
  async getAllServices(req: Request, res: Response) {
    try {
      const services = await StreamingService.find()
        .sort({ displayPriority: -1, name: 1 })
        .lean();
      
      res.json({
        success: true,
        data: services,
      });
    } catch (error) {
      console.error('Error fetching streaming services:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch streaming services',
      });
    }
  }

  // GET /api/users/me/streaming-services - Get user's selected services
  async getUserServices(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      const userServices = await UserStreamingService.find({ userId })
        .populate('streamingServiceId')
        .lean();
      
      res.json({
        success: true,
        data: userServices.map((us: any) => us.streamingServiceId),
      });
    } catch (error) {
      console.error('Error fetching user streaming services:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user streaming services',
      });
    }
  }

  // POST /api/users/me/streaming-services - Add a streaming service to user
  async addUserService(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { streamingServiceId } = req.body;

      if (!streamingServiceId) {
        return res.status(400).json({
          success: false,
          message: 'streamingServiceId is required',
        });
      }

      // Check if service exists
      const service = await StreamingService.findById(streamingServiceId);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Streaming service not found',
        });
      }

      // Check if already added
      const existing = await UserStreamingService.findOne({
        userId,
        streamingServiceId,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Streaming service already added',
        });
      }

      // Add service
      await UserStreamingService.create({
        userId,
        streamingServiceId,
      });

      res.status(201).json({
        success: true,
        message: 'Streaming service added successfully',
        data: service,
      });
    } catch (error) {
      console.error('Error adding user streaming service:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add streaming service',
      });
    }
  }

  // DELETE /api/users/me/streaming-services/:id - Remove a streaming service
  async removeUserService(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const deleted = await UserStreamingService.findOneAndDelete({
        userId,
        streamingServiceId: id,
      });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Streaming service not found in user list',
        });
      }

      res.json({
        success: true,
        message: 'Streaming service removed successfully',
      });
    } catch (error) {
      console.error('Error removing user streaming service:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove streaming service',
      });
    }
  }

  // PUT /api/users/me/streaming-services - Replace the user's streaming services list
  async setUserServices(req: AuthedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { serviceIds } = req.body || {};

      if (!Array.isArray(serviceIds)) {
        return res.status(400).json({
          success: false,
          message: 'serviceIds must be an array',
        });
      }

      const uniqueIds = Array.from(
        new Set(
          serviceIds
            .filter((id) => typeof id === 'string' && Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id))
        )
      );

      if (uniqueIds.length === 0) {
        await UserStreamingService.deleteMany({ userId });
        await User.findByIdAndUpdate(userId, { services: [] }, { new: false });
        return res.json({ success: true, data: [] });
      }

      const services = await StreamingService.find({ _id: { $in: uniqueIds } })
        .lean();

      const validIds = services.map((svc: any) => svc._id as Types.ObjectId);

      if (validIds.length === 0) {
        await UserStreamingService.deleteMany({ userId });
        await User.findByIdAndUpdate(userId, { services: [] }, { new: false });
        return res.json({ success: true, data: [] });
      }

      await UserStreamingService.deleteMany({
        userId,
        streamingServiceId: { $nin: validIds },
      });

      await Promise.all(
        validIds.map((streamingServiceId) =>
          UserStreamingService.updateOne(
            { userId, streamingServiceId },
            { $setOnInsert: { userId, streamingServiceId } },
            { upsert: true }
          )
        )
      );

      const canonicalSet = Array.from(
        new Set<Service>(
          services
            .map((svc: any) => PROVIDER_TO_CANONICAL[svc.tmdbProviderId])
            .filter((value): value is Service => Boolean(value))
        )
      );

      await User.findByIdAndUpdate(
        userId,
        { services: canonicalSet },
        { new: false }
      );

      const sortedServices = services.sort((a: any, b: any) => {
        const priorityDiff =
          (b.displayPriority ?? 0) - (a.displayPriority ?? 0);
        if (priorityDiff !== 0) return priorityDiff;
        return String(a.name).localeCompare(String(b.name));
      });

      res.json({
        success: true,
        data: sortedServices,
      });
    } catch (error) {
      console.error('Error setting user streaming services:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update streaming services',
      });
    }
  }

  // POST /api/admin/streaming-services/seed - Seed initial streaming services
  async seedServices(req: Request, res: Response) {
    try {
      // Popular US streaming services
      const services = [
        { tmdbProviderId: 8, name: 'Netflix', displayPriority: 10 },
        { tmdbProviderId: 9, name: 'Amazon Prime Video', displayPriority: 9 },
        { tmdbProviderId: 337, name: 'Disney Plus', displayPriority: 8 },
        { tmdbProviderId: 384, name: 'HBO Max', displayPriority: 7 },
        { tmdbProviderId: 15, name: 'Hulu', displayPriority: 6 },
        { tmdbProviderId: 350, name: 'Apple TV Plus', displayPriority: 5 },
        { tmdbProviderId: 531, name: 'Paramount Plus', displayPriority: 4 },
        { tmdbProviderId: 387, name: 'Peacock', displayPriority: 3 },
      ];

      for (const service of services) {
        await StreamingService.findOneAndUpdate(
          { tmdbProviderId: service.tmdbProviderId },
          service,
          { upsert: true, new: true }
        );
      }

      const count = await StreamingService.countDocuments();

      res.json({
        success: true,
        message: `Seeded ${services.length} streaming services`,
        total: count,
      });
    } catch (error) {
      console.error('Error seeding streaming services:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to seed streaming services',
      });
    }
  }
}

export default new StreamingServiceController();
