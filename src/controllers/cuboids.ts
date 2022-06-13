import { Request, Response } from 'express';
import * as HttpStatus from 'http-status-codes';
import { Id } from 'objection';
import { Cuboid, Bag } from '../models';

export const list = async (req: Request, res: Response): Promise<Response> => {
  const ids = req.query.ids as Id[];
  const cuboids = await Cuboid.query().findByIds(ids).withGraphFetched('bag');

  return res.status(200).json(cuboids);
};

export const get = async (req: Request, res: Response): Promise<Response> => {
  const {
    params: { id },
  } = req;

  const cuboid = await Cuboid.query().findById(id);

  if (!cuboid) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  return res.status(HttpStatus.OK).json({
    id: Number(req.params.id),
    volume: cuboid?.getVolume(),
  });
};

export const create = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { width, height, depth, bagId } = req.body;

  const bag = await Bag.query().findById(bagId);

  if (!bag) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  const cuboid: Cuboid = Cuboid.fromJson({ width, height, depth, bagId });

  bag.cuboids = await Cuboid.query().where('bagId', bagId);
  bag.cuboids.push(cuboid);

  bag.availableVolume = bag.volume;
  bag.payloadVolume = bag.getPayloadVolume();

  if (bag.payloadVolume > bag.availableVolume) {
    return res
      .status(HttpStatus.UNPROCESSABLE_ENTITY)
      .json({ message: 'Insufficient capacity in bag' });
  }

  const newCuboid = await Cuboid.query().insert({
    width,
    height,
    depth,
    bagId,
  });

  return res.status(HttpStatus.CREATED).json(newCuboid);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    params: { id },
    body: { width, height, depth, bagId },
  } = req;

  const cuboidToModify = await Cuboid.query().findById(id);

  if (!cuboidToModify) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  const bag = await Bag.query().findById(bagId);

  if (!bag) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  const cuboid: Cuboid = Cuboid.fromJson({ width, height, depth, bagId });

  bag.cuboids = await Cuboid.query().where('bagId', bagId);
  bag.cuboids.push(cuboid);

  bag.availableVolume = bag.volume;
  bag.payloadVolume = bag.getPayloadVolume();

  if (bag.payloadVolume > bag.availableVolume) {
    return res
      .status(HttpStatus.UNPROCESSABLE_ENTITY)
      .json({ message: 'Insufficient capacity in bag' });
  }

  const newCuboid = await Cuboid.query().patchAndFetchById(id, {
    width,
    height,
    depth,
  });

  newCuboid.bag = bag;

  return res.status(HttpStatus.OK).json(newCuboid);
};

export const deleteById = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    params: { id },
  } = req;

  const cuboid = await Cuboid.query().findById(id);

  if (!cuboid) {
    return res.sendStatus(HttpStatus.NOT_FOUND);
  }

  Cuboid.query().deleteById(id);

  return res.sendStatus(HttpStatus.OK);
};
