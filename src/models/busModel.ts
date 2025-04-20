import mongoose, { Document, Schema } from 'mongoose';

export interface IBus extends Document {
  name: string;
  busNumber: string;
  source: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  capacity: number;
  availableSeats: number;
  price: number;
}

const busSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add bus name'],
    },
    busNumber: {
      type: String,
      required: [true, 'Please add bus number'],
      unique: true,
    },
    source: {
      type: String,
      required: [true, 'Please add source location'],
    },
    destination: {
      type: String,
      required: [true, 'Please add destination location'],
    },
    departureTime: {
      type: Date,
      required: [true, 'Please add departure time'],
    },
    arrivalTime: {
      type: Date,
      required: [true, 'Please add arrival time'],
    },
    capacity: {
      type: Number,
      required: [true, 'Please add capacity'],
    },
    availableSeats: {
      type: Number,
    },
    price: {
      type: Number,
      required: [true, 'Please add price'],
    },
  },
  {
    timestamps: true,
  }
);

// Set available seats equal to capacity if not provided
busSchema.pre('save', function (next) {
  if (this.isNew && this.availableSeats === undefined) {
    this.availableSeats = this.capacity;
  }
  next();
});

export default mongoose.model<IBus>('Bus', busSchema);
