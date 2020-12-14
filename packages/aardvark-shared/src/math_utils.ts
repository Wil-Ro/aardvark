import { MinimalPose, AvNodeTransform, AvVector } from './aardvark_protocol';
import { vec3, mat4, vec4, mat3, quat } from '@tlaukkan/tsm';
import * as Quaternion from 'quaternion';

export function translateMat( t: vec3)
{
	let m = new mat4();
	m.setIdentity();
	m.translate( t );
	return m;
}

export function scaleMat( s: vec3)
{
	let m = new mat4();
	m.setIdentity();
	m.scale( s );
	return m;
}

export function quatFromAxisAngleDegrees( axis: vec3, deg?: number ): quat
{
	if( !deg )
		return new quat( quat.identity.xyzw );

	return quat.fromAxisAngle( axis, deg * Math.PI / 180 );
}

export function rotationMatFromEulerDegrees( r: vec3 )
{
	let qx = quatFromAxisAngleDegrees( vec3.right, r.x );
	let qy = quatFromAxisAngleDegrees( vec3.up, r.y );
	let qz = quatFromAxisAngleDegrees( vec3.forward, r.z );

	let q = qx.multiply( qy ).multiply( qz );
	return q.toMat4();
}

export function getRowFromMat( m: mat4, n: number ) : vec3 
{
	let row = m.row( n );
	return new vec3( [ row[ 0 ], row[ 1 ],row[ 2 ], ] );
}

export function nodeTransformFromMat4( m: mat4 ) : AvNodeTransform
{
	if( !m )
	{
		return undefined;
	}

	let transform: AvNodeTransform = {};
	let pos = m.multiplyVec4( new vec4( [ 0, 0, 0, 1 ] ) );
	if( pos.x != 0 || pos.y != 0 || pos.z != 0 )
	{
		transform.position = { x: pos.x, y: pos.y, z: pos.z };
	}

	let xScale = getRowFromMat( m, 0 ).length();
	let yScale = getRowFromMat( m, 1 ).length();
	let zScale = getRowFromMat( m, 2 ).length();
	if( xScale != 1 || yScale != 1 || zScale != 1 )
	{
		transform.scale = { x : xScale, y: yScale, z: zScale };
	}

	let rotMat = new mat3( 
		[
			m.at( 0 + 0 ) / xScale, m.at( 0 + 1 ) / xScale, m.at( 0 + 2 ) / xScale,
			m.at( 4 + 0 ) / yScale, m.at( 4 + 1 ) / yScale, m.at( 4 + 2 ) / yScale,
			m.at( 8 + 0 ) / zScale, m.at( 8 + 1 ) / zScale, m.at( 8 + 2 ) / zScale,
		] );
	let rot = rotMat.toQuat();
	if( rot.x != 0 || rot.y != 0 || rot.z != 0 )
	{
		transform.rotation = { x: rot.x, y: rot.y, z: rot.z, w: rot.w };
	}

	return transform;
}

export function nodeTransformToMat4( transform: AvNodeTransform ): mat4
{
	if( !transform )
	{
		return mat4.identity;
	}
	
	let vTrans: vec3;
	if ( transform.position )
	{
		vTrans = new vec3( [ transform.position.x, transform.position.y, transform.position.z ] );
	}
	else
	{
		vTrans = new vec3( [ 0, 0, 0 ] );
	}
	let vScale: vec3;
	if ( transform.scale )
	{
		vScale = new vec3( [ transform.scale.x, transform.scale.y, transform.scale.z ] );
	}
	else
	{
		vScale = new vec3( [ 1, 1, 1 ] );
	}
	let qRot: quat;
	if ( transform.rotation )
	{
		qRot = new quat( [ transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w ] );
	}
	else
	{
		qRot = new quat( [ 0, 0, 0, 1 ] );
	}

	let mat = translateMat( vTrans ).multiply( qRot.toMat4() );
	mat = mat.multiply( scaleMat( vScale ) ) ;
	
	if( Number.isNaN( mat.at( 0 ) ) )
	{
		throw new Error( "Garbage passed into nodeTransformToMat4 resulted in NaN in output" );
	}

	return mat;
}

export function computeUniverseFromLine( lineStart: vec3, lineEnd: vec3, thickness: number ): mat4
{
	let lineVector = new vec3( lineEnd.xyz );
	lineVector.subtract( lineStart );
	let lineLength = lineVector.length();
	lineVector.normalize();
	let cylinderCenter = new vec3( lineStart.xyz ).add( new vec3( lineVector.xyz ).scale( lineLength / 2 ) );

	let ybasis = lineVector;
	let xbasis: vec3;
	if( ybasis.x > 0.99 )
	{
		xbasis = new vec3([ 0, 1, 0 ] );
	} 
	else
	{
		xbasis = new vec3([ 1, 0, 0 ] );
	} 
	let zbasis = vec3.cross( ybasis, xbasis, new vec3() );
	zbasis.normalize();
	xbasis = vec3.cross( zbasis, ybasis, xbasis );
	let lineRotation = new mat4(
		[ 
			xbasis.x, xbasis.y, xbasis.z, 0,
			ybasis.x, ybasis.y, ybasis.z, 0,
			zbasis.x, zbasis.y, zbasis.z, 0,
			0, 0, 0, 1,
		]
	);

	let scale = scaleMat( new vec3( [ thickness, lineLength, thickness ] ) );
	return translateMat( cylinderCenter ).multiply( lineRotation.multiply( scale ) ); 
}

export function vec3MultiplyAndAdd( base: vec3, direction: vec3, distance: number ): vec3
{
	return new vec3(
		[
			base.x + direction.x * distance,
			base.y + direction.y * distance,
			base.z + direction.z * distance,
		]
	)
}

export function scaleAxisToFit( limit: number, min: number, max: number ): number
{
	let extent = Math.max( -min, max );
	if( extent <= 0 )
	{
		return null;
	}
	else
	{
		return limit / extent;
	}
}

export function minIgnoringNulls( ...values: number[] )
{
	let noNulls = values.filter( ( v:number) => { return v != null; } );
	if( noNulls )
	{
		return Math.min( ...noNulls );
	}
	else
	{
		return null;
	}
}

export function lerpAvTransforms( xf0: AvNodeTransform, xf1: AvNodeTransform, t: number ): AvNodeTransform
{
	let result = { ...xf1 };
	if( xf0 && xf0.position && xf1.position )
	{
		let t0 = new vec3( [ xf0.position.x, xf0.position.y, xf0.position.z ] );
		let t1 = new vec3( [ xf1.position.x, xf1.position.y, xf1.position.z ] );
		let trans = vec3.mix( t0, t1, t, new vec3() );
		result.position =
		{
			x: trans.x,
			y: trans.y,
			z: trans.z,
		}
	}

	if( xf0 && xf0.scale && xf1.scale )
	{
		let s0 = new vec3( [ xf0.scale.x, xf0.scale.y, xf0.scale.z ] );
		let s1 = new vec3( [ xf1.scale.x, xf1.scale.y, xf1.scale.z ] );
		let scale = vec3.mix( s0, s1, t, new vec3() );
		result.scale =
		{
			x: scale.x,
			y: scale.y,
			z: scale.z,
		}
	}

	if( xf0 && xf0.rotation && xf1.rotation )
	{
		let r0 = new Quaternion( xf0.rotation );
		let r1 = new Quaternion( xf1.rotation );
		let rot = r0.slerp( r1 )( t );
		result.rotation =
		{
			w: rot.w,
			x: rot.x,
			y: rot.y,
			z: rot.z,
		}
	}

	return result;
}

export function invertNodeTransform( from: AvNodeTransform ): AvNodeTransform
{
	if( !from )
		return from;

	let fromMat = nodeTransformToMat4( from );
	return nodeTransformFromMat4( fromMat.copy().inverse() );
}

export function minimalPoseFromTransform( from: AvNodeTransform ): MinimalPose
{
	let mat = nodeTransformToMat4( from );
	let rot = mat.toMat3().toQuat();
	let pos = mat.multiplyVec4( new vec4( [ 0, 0, 0, 1 ] ) );
	return [ pos.x, pos.y, pos.z, rot.w, rot.x, rot.y, rot.z ];
}

export function minimalToMat4Transform( minimal: MinimalPose ): mat4
{
	let transform: AvNodeTransform = 
	{
		position: { x: minimal[0], y: minimal[1], z: minimal[2] },
		rotation: { w: minimal[3], x: minimal[4], y: minimal[5], z: minimal[6] }, 
	};
	return nodeTransformToMat4( transform );
}

export function multiplyTransforms( lhs: AvNodeTransform, rhs: AvNodeTransform )
{
	let lm = nodeTransformToMat4( lhs );
	let rm = nodeTransformToMat4( rhs );
	return nodeTransformFromMat4( mat4.product( lm, rm, new mat4() ) );
}

export function matMultiplyPoint( m: mat4, pt: vec3 ): vec3
{
	let v4 = new vec4( [ pt.x, pt.y, pt.z, 1 ] );
	return new vec3( m.multiplyVec4( v4, new vec4() ).xyz );
}

export function vecFromAvVector( v: AvVector ): vec3
{
	if( !v )
		return null;
	return new vec3( [ v.x, v.y, v.z ] );
}

export function vecToAvVector( v: vec3 ): AvVector
{
	if( !v )
		return null;
	return { x: v.x, y: v.y, z: v.z };
}
