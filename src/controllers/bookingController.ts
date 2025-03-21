import { Request, Response } from 'express';
import Booking, { IBooking } from '../models/bookingModel';
import Bus from '../models/busModel';
import { emitBookingUpdate } from '../services/socketService';

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { busId, seatNumber } = req.body;

    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Find bus
    const bus = await Bus.findById(busId);

    if (!bus) {
      res.status(404).json({ message: 'Bus not found' });
      return;
    }

    // Check if enough seats are available
    if (bus.availableSeats < seatNumber.length) {
      res.status(400).json({ message: 'Not enough seats available' });
      return;
    }

    // Calculate total price
    const totalPrice = seatNumber.length * bus.price;

    // Create booking
    const booking = await Booking.create({
      userId: req.user._id,
      busId,
      seatNumber,
      totalPrice,
    });

    // Update available seats
    bus.availableSeats -= seatNumber.length;
    await bus.save();

    // Emit socket event for realtime updates
    emitBookingUpdate(booking);

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const bookings = await Booking.find({ userId: req.user._id })
      .populate('busId')
      .sort('-createdAt');

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id
// @access  Private
export const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, paymentStatus } = req.body;
    
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Check if user owns this booking or is admin
    if ((req.user?._id.toString() !== booking.userId.toString()) && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    // Update booking
    booking.status = status || booking.status;
    booking.paymentStatus = paymentStatus || booking.paymentStatus;
    
    const updatedBooking = await booking.save();
    
    // Emit socket event for realtime updates
    emitBookingUpdate(updatedBooking);

    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};